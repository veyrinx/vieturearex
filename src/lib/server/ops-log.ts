import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { SITE_URL } from "@/lib/constants/site";

/**
 * Vỏ bọc cho việc định kỳ: kiểm tra CRON_SECRET, bấm giờ, ghi lại kết quả vào
 * bảng ops_runs và báo Telegram khi một việc bắt đầu hỏng.
 *
 * Trước đây mỗi route cron tự chép đoạn kiểm tra Authorization rồi chạy, không
 * để lại dấu vết gì. Cron chết thì chết lặng lẽ: log Vercel giữ ngắn ngày, mà
 * không ai mở ra soi cho tới lúc người dùng kêu. Giờ mọi lần chạy đều có một
 * dòng — /admin/ops đọc bảng này để chỉ ra việc nào chết, việc nào quá hạn.
 *
 * Ghi log KHÔNG bao giờ được làm hỏng việc chính: mọi lỗi ở khâu ghi đều nuốt.
 */

/** Giữ nhật ký bao lâu — dọn kèm khi việc dọn dữ liệu quá hạn chạy. */
const RETENTION_DAYS = 30;

/** Cắt bớt kết quả trả về trước khi cất vào jsonb, tránh phình bảng. */
const MAX_SUMMARY_CHARS = 2000;

type Json = Record<string, unknown>;

function trimSummary(body: unknown): Json | null {
  if (body === null || typeof body !== "object") {
    return body === undefined ? null : { value: String(body).slice(0, 200) };
  }
  const raw = JSON.stringify(body);
  if (raw.length <= MAX_SUMMARY_CHARS) return body as Json;

  // Quá dài: giữ các trường vô hướng (đủ để đọc "làm được bao nhiêu"), phần
  // mảng/đối tượng lồng nhau chỉ ghi kích thước.
  const out: Json = { _truncated: true };
  for (const [k, v] of Object.entries(body as Json)) {
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
      out[k] = typeof v === "string" ? v.slice(0, 200) : v;
    } else if (Array.isArray(v)) {
      out[k] = `[${v.length} mục]`;
    } else {
      out[k] = "{…}";
    }
  }
  return out;
}

/**
 * Lần chạy này coi là hỏng chưa? Nhiều route trả HTTP 200 kèm `{ ok: false }`
 * hoặc `{ error }` — nhìn status code không thôi sẽ báo "xanh" cho một việc đã
 * chết. Riêng `skipped` (bị tắt trong cài đặt) vẫn tính là chạy thành công.
 */
function isFailure(status: number, body: unknown): boolean {
  if (status >= 400) return true;
  if (!body || typeof body !== "object") return false;
  const b = body as Json;
  if (b.ok === false) return true;
  if (typeof b.error === "string" && b.error) return true;
  return false;
}

function errorText(status: number, body: unknown): string | null {
  if (!body || typeof body !== "object") return status >= 400 ? `HTTP ${status}` : null;
  const b = body as Json;
  const msg = [b.error, b.reason, b.message].find((v) => typeof v === "string" && v) as string | undefined;
  return msg ? msg.slice(0, 500) : status >= 400 ? `HTTP ${status}` : null;
}

type RunRecord = {
  job: string;
  ok: boolean;
  durationMs: number;
  summary: Json | null;
  error: string | null;
  trigger: "cron" | "manual";
  startedAt: Date;
};

/** Ghi một dòng nhật ký. Trả về true nếu đây là lần hỏng ĐẦU của chuỗi. */
async function recordRun(run: RunRecord): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;

  let firstFailure = false;
  try {
    if (!run.ok) {
      // Chỉ báo động ở lần hỏng đầu tiên: cron ngày mà hỏng liên tục thì mỗi
      // ngày một tin cũng đủ phiền, hỏng 5 lần liên tiếp không cần 5 tin.
      const { data } = (await untypedFrom(db, "ops_runs")
        .select("ok")
        .eq("job", run.job)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { ok: boolean } | null };
      firstFailure = !data || data.ok === true;
    }

    const { error } = (await untypedFrom(db, "ops_runs").insert({
      job: run.job,
      ok: run.ok,
      duration_ms: run.durationMs,
      summary: run.summary,
      error: run.error,
      trigger: run.trigger,
      started_at: run.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    })) as { error: { message: string } | null };

    // supabase-js KHÔNG ném lỗi, nó trả về trong `error` — không đọc là hỏng
    // lặng lẽ đúng cái bệnh mà bảng này sinh ra để chữa (chưa chạy migration là
    // nhật ký trống trơn mà chẳng ai biết vì sao).
    if (error) console.warn("[ops-log] không ghi được nhật ký:", error.message);

    // Dọn nhật ký cũ đúng một lần mỗi ngày — ké chuyến dọn dữ liệu quá hạn để
    // khỏi thêm một cron riêng (Hobby chỉ cho mỗi việc một lần/ngày).
    if (run.job === "purge-expired") {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
      await untypedFrom(db, "ops_runs").delete().lt("started_at", cutoff);
    }
  } catch (err) {
    console.warn("[ops-log] không ghi được nhật ký:", err);
  }
  return firstFailure;
}

async function alertFailure(run: RunRecord, label: string, impact?: string) {
  try {
    await sendTelegramNotification({
      title: `Việc định kỳ lỗi — ${label}`,
      subtitle: vnNow(),
      sections: [
        {
          heading: "Chi tiết",
          rows: [
            { label: "Việc", value: run.job, mono: true },
            { label: "Trạng thái", value: run.error ?? "Không rõ", status: "err" },
            { label: "Thời lượng", value: `${(run.durationMs / 1000).toFixed(1)}s` },
            ...(impact ? [{ label: "Ảnh hưởng", value: impact }] : []),
          ],
        },
      ],
      actions: [{ label: "Xem nhật ký vận hành", url: `${SITE_URL}/admin/ops` }],
      footer: "Chỉ báo ở lần hỏng đầu tiên — chạy lại vẫn hỏng thì không nhắc lại.",
    });
  } catch (err) {
    console.warn("[ops-log] không gửi được cảnh báo:", err);
  }
}

/**
 * Bọc handler của một route cron.
 *
 *   export const GET = withCron("ff-watch", async (req) => { ... });
 *
 * Handler cứ trả NextResponse như thường; vỏ đọc bản sao để biết lần chạy này
 * ra kết quả gì. Yêu cầu không kèm CRON_SECRET bị chặn ngay và KHÔNG ghi log
 * (nếu ghi thì chỉ cần ai đó quét URL là nhật ký đầy rác).
 */
export function withCron(
  job: string,
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  options?: {
    /**
     * Kiểm tra quyền thay cho CRON_SECRET — dùng cho việc vừa chạy theo lịch
     * vừa cho admin bấm tay (xem /api/cron/shop-stale-orders). Trả về response
     * để từ chối, hoặc null để cho chạy.
     */
    authorize?: (request: NextRequest) => Promise<NextResponse | null> | NextResponse | null;
  },
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    if (options?.authorize) {
      const denied = await options.authorize(request);
      if (denied) return denied;
    } else {
      const expected = process.env.CRON_SECRET;
      const auth = request.headers.get("authorization") ?? "";
      if (expected && auth !== `Bearer ${expected}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const trigger = request.headers.get("x-ops-trigger") === "manual" ? "manual" : "cron";
    const startedAt = new Date();
    let response: NextResponse;
    let body: unknown = null;
    let thrown: string | null = null;

    try {
      response = await handler(request);
      body = await response.clone().json().catch(() => null);
    } catch (err) {
      thrown = err instanceof Error ? `${err.message}` : String(err);
      response = NextResponse.json({ ok: false, error: thrown }, { status: 500 });
      body = { ok: false, error: thrown };
    }

    const durationMs = Date.now() - startedAt.getTime();
    const ok = !thrown && !isFailure(response.status, body);
    const run: RunRecord = {
      job,
      ok,
      durationMs,
      summary: trimSummary(body),
      error: thrown ? thrown.slice(0, 500) : errorText(response.status, body),
      trigger,
      startedAt,
    };

    const firstFailure = await recordRun(run);
    if (!ok && firstFailure) {
      const { CRON_JOBS } = await import("@/lib/constants/cron-jobs");
      const meta = CRON_JOBS.find((c) => c.job === job);
      await alertFailure(run, meta?.label ?? job, meta?.impact);
    }

    return response;
  };
}
