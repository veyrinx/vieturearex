import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { CRON_JOBS, describeSchedule, intervalHours, isKnownCronJob } from "@/lib/constants/cron-jobs";
import { getFfApiStatus } from "@/lib/server/ff-api";

/**
 * Sức khoẻ việc định kỳ: việc nào vừa chạy, mất bao lâu, lỗi gì, việc nào đã
 * quá hạn mà không thấy chạy.
 *
 * "Quá hạn" mới là thứ đáng giá nhất ở đây: cron KHÔNG chạy thì chẳng có dòng
 * lỗi nào để mà nhìn — nó im lặng tuyệt đối. Cách duy nhất phát hiện là so mốc
 * chạy gần nhất với nhịp trong vercel.json.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chậm quá nhịp bao nhiêu thì coi là quá hạn (1.5 nhịp + 1 giờ chờ trễ lịch). */
const OVERDUE_FACTOR = 1.5;
const OVERDUE_GRACE_MS = 60 * 60_000;

const WINDOW_DAYS = 7;

type RunRow = {
  job: string;
  ok: boolean;
  duration_ms: number;
  summary: Record<string, unknown> | null;
  error: string | null;
  trigger: string;
  started_at: string;
};

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Chưa cấu hình Supabase." }, { status: 500 });

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = (await untypedFrom(db, "ops_runs")
    .select("job, ok, duration_ms, summary, error, trigger, started_at")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(2000)) as { data: RunRow[] | null; error: { message: string; code?: string } | null };

  if (error) {
    // Chưa chạy migration thì nói thẳng, đừng để trang trắng không hiểu vì sao.
    const missing = /ops_runs/.test(error.message) && /(does not exist|schema cache)/i.test(error.message);
    return NextResponse.json(
      {
        error: missing
          ? "Chưa có bảng ops_runs — chạy supabase/migration-ops-runs.sql trên Supabase SQL Editor."
          : error.message,
      },
      { status: missing ? 409 : 500 },
    );
  }

  const runs = data ?? [];
  const now = Date.now();

  const jobs = CRON_JOBS.map((meta) => {
    const mine = runs.filter((r) => r.job === meta.job);
    const last = mine[0] ?? null;
    const hours = intervalHours(meta.schedule);
    const lastMs = last ? new Date(last.started_at).getTime() : 0;
    const overdue = !last || now - lastMs > hours * 3_600_000 * OVERDUE_FACTOR + OVERDUE_GRACE_MS;

    // Chuỗi hỏng liên tiếp tính từ lần gần nhất — 1 lần hỏng có thể là mạng
    // chập chờn, 3 lần liên tiếp thì chắc chắn hỏng thật.
    let failStreak = 0;
    for (const r of mine) {
      if (r.ok) break;
      failStreak += 1;
    }

    const durations = mine.map((r) => r.duration_ms).filter((n) => Number.isFinite(n));
    return {
      job: meta.job,
      label: meta.label,
      impact: meta.impact ?? null,
      path: meta.path,
      schedule: meta.schedule,
      scheduleText: describeSchedule(meta.schedule),
      intervalHours: hours,
      overdue,
      failStreak,
      runs: mine.length,
      fails: mine.filter((r) => !r.ok).length,
      avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      maxMs: durations.length ? Math.max(...durations) : null,
      last: last
        ? {
            ok: last.ok,
            startedAt: last.started_at,
            durationMs: last.duration_ms,
            error: last.error,
            trigger: last.trigger,
            summary: last.summary,
          }
        : null,
    };
  });

  // Việc từng chạy nhưng không còn trong vercel.json (đã gỡ lịch, hoặc đổi tên
  // mà quên) — hiện riêng để không âm thầm biến mất.
  const unknownJobs = [...new Set(runs.map((r) => r.job))].filter((j) => !isKnownCronJob(j));

  return NextResponse.json({
    windowDays: WINDOW_DAYS,
    jobs,
    unknownJobs,
    totals: {
      runs: runs.length,
      fails: runs.filter((r) => !r.ok).length,
      overdue: jobs.filter((j) => j.overdue).length,
    },
    ff: getFfApiStatus(),
  });
}

/** POST { job } — chạy tay một việc ngay, để thử sau khi sửa. */
export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { job?: string };
  const job = (body.job ?? "").trim();
  const meta = CRON_JOBS.find((c) => c.job === job);
  if (!meta) return NextResponse.json({ error: "Không có việc định kỳ này." }, { status: 400 });

  // Gọi qua chính origin đang phục vụ request này: chắc chắn là bản triển khai
  // đang chạy, khỏi lo tên miền phụ đang 308 (xem serving-origin.ts).
  const origin = new URL(request.url).origin;
  const secret = process.env.CRON_SECRET;

  const started = Date.now();
  const res = await fetch(`${origin}${meta.path}`, {
    headers: {
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      "x-ops-trigger": "manual",
    },
    // Cron nặng nhất (quét nick) đặt maxDuration 300s; chờ tối đa ngần ấy.
    signal: AbortSignal.timeout(300_000),
  }).catch((err: unknown) => {
    return { ok: false, status: 0, json: async () => ({ error: String(err) }) } as unknown as Response;
  });

  const result = await res.json().catch(() => ({}));
  return NextResponse.json({
    job,
    status: res.status,
    durationMs: Date.now() - started,
    result,
  });
}
