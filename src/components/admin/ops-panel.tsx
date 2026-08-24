"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Gauge, Loader2, Play, RefreshCw, XCircle } from "lucide-react";

/**
 * Sức khoẻ việc định kỳ.
 *
 * Thứ đáng nhìn nhất không phải dòng lỗi mà là ô "quá hạn": cron KHÔNG chạy thì
 * không sinh ra lỗi nào cả, nó im lặng tuyệt đối — chỉ lộ khi so mốc chạy gần
 * nhất với nhịp khai trong vercel.json.
 */

type Job = {
  job: string;
  label: string;
  impact: string | null;
  path: string;
  schedule: string;
  scheduleText: string;
  intervalHours: number;
  overdue: boolean;
  failStreak: number;
  runs: number;
  fails: number;
  avgMs: number | null;
  maxMs: number | null;
  last: {
    ok: boolean;
    startedAt: string;
    durationMs: number;
    error: string | null;
    trigger: string;
    summary: Record<string, unknown> | null;
  } | null;
};

type FfStatus = {
  configured: boolean;
  remainingToday: number | null;
  exhausted: boolean;
  cacheEntries: number;
  calls: number;
  cacheHits: number;
  errors: number;
};

type Payload = {
  windowDays: number;
  jobs: Job[];
  unknownJobs: string[];
  totals: { runs: number; fails: number; overdue: number };
  ff: FfStatus;
  error?: string;
};

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

function secs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function statusOf(j: Job): { label: string; cls: string; Icon: typeof CheckCircle2 } {
  if (!j.last) return { label: "Chưa chạy lần nào", cls: "border-amber-500/40 text-amber-500", Icon: Clock };
  if (j.overdue) return { label: "Quá hạn", cls: "border-amber-500/40 text-amber-500", Icon: Clock };
  if (!j.last.ok) return { label: "Lỗi", cls: "border-rose-500/40 text-rose-500", Icon: XCircle };
  return { label: "Bình thường", cls: "border-emerald-500/30 text-emerald-500", Icon: CheckCircle2 };
}

export function OpsPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Payload;
      if (!res.ok) {
        setError(json.error ?? "Không tải được dữ liệu.");
        setData(null);
      } else {
        setError(null);
        setData(json);
      }
    } catch {
      setError("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runNow(job: string) {
    setRunning(job);
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: number;
        durationMs?: number;
        error?: string;
      };
      if (!res.ok) toast.error(json.error ?? "Không chạy được.");
      else if ((json.status ?? 0) >= 400) toast.error(`Việc chạy xong nhưng báo lỗi (HTTP ${json.status}).`);
      else toast.success(`Đã chạy ${job} trong ${secs(json.durationMs ?? 0)}.`);
      await load();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black uppercase text-foreground">Vận hành</h1>
          <p className="text-xs text-muted-foreground">
            Việc định kỳ (cron) và quota API Free Fire. Lịch chạy lấy thẳng từ vercel.json.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-500">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tải…
        </div>
      ) : data ? (
        <>
          {/* Tổng quan */}
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { label: "Việc theo lịch", value: String(data.jobs.length) },
              { label: `Lượt chạy ${data.windowDays} ngày`, value: String(data.totals.runs) },
              { label: "Lượt hỏng", value: String(data.totals.fails), warn: data.totals.fails > 0 },
              { label: "Đang quá hạn", value: String(data.totals.overdue), warn: data.totals.overdue > 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-black ${s.warn ? "text-rose-500" : "text-foreground"}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quota FF — cạn quota là mọi tính năng FF cùng chết, nên để ngay trên đầu */}
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-foreground">
              <Gauge className="size-3.5" /> API Free Fire
            </p>
            {!data.ff.configured ? (
              <p className="text-xs text-muted-foreground">Chưa cấu hình HLFF_API_KEY / HLFF_USER_UID.</p>
            ) : (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Lượt còn hôm nay:{" "}
                  <b className={data.ff.exhausted ? "text-rose-500" : "text-foreground"}>
                    {data.ff.remainingToday ?? "chưa rõ"}
                  </b>
                </span>
                <span>
                  Đã gọi: <b className="text-foreground">{data.ff.calls}</b>
                </span>
                <span>
                  Tiết kiệm nhờ đệm: <b className="text-foreground">{data.ff.cacheHits}</b>
                </span>
                <span>
                  Lỗi: <b className="text-foreground">{data.ff.errors}</b>
                </span>
              </div>
            )}
            <p className="text-[11px] italic text-muted-foreground">
              Số liệu đếm từ lúc tiến trình hiện tại khởi động — serverless nên sẽ về 0 sau mỗi lần triển khai.
            </p>
          </div>

          {/* Từng việc */}
          <div className="space-y-2">
            {data.jobs.map((j) => {
              const st = statusOf(j);
              return (
                <div key={j.job} className={`space-y-2 rounded-xl border bg-card p-3 ${st.cls}`}>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <st.Icon className="size-3.5 shrink-0" />
                    <span className="font-black uppercase tracking-wider">{j.label}</span>
                    <span className="font-mono opacity-70">{j.job}</span>
                    <span className="rounded-full border border-current px-2 py-0.5 font-bold">{st.label}</span>
                    <span className="ml-auto opacity-70">{j.scheduleText}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      Gần nhất:{" "}
                      <b className="text-foreground">{j.last ? ago(j.last.startedAt) : "chưa có"}</b>
                      {j.last?.trigger === "manual" && " (chạy tay)"}
                    </span>
                    {j.last && (
                      <span>
                        Thời lượng: <b className="text-foreground">{secs(j.last.durationMs)}</b>
                        {j.avgMs !== null && ` · TB ${secs(j.avgMs)}`}
                      </span>
                    )}
                    <span>
                      {j.runs} lượt / {j.fails} hỏng
                      {j.failStreak > 1 && ` · hỏng ${j.failStreak} lần liên tiếp`}
                    </span>
                  </div>

                  {j.last?.error && (
                    <p className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 font-mono text-[11px] text-rose-500">
                      {j.last.error}
                    </p>
                  )}

                  {j.last?.summary && (
                    <p className="line-clamp-2 break-all font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(j.last.summary)}
                    </p>
                  )}

                  {(j.overdue || !j.last?.ok) && j.impact && (
                    <p className="text-[11px] italic text-muted-foreground">Hỏng thì: {j.impact}</p>
                  )}

                  <button
                    onClick={() => void runNow(j.job)}
                    disabled={running !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    {running === j.job ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    Chạy ngay
                  </button>
                </div>
              );
            })}
          </div>

          {data.unknownJobs.length > 0 && (
            <p className="rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
              Có nhật ký của việc không còn trong vercel.json:{" "}
              <b className="font-mono text-foreground">{data.unknownJobs.join(", ")}</b> — lịch đã gỡ hoặc đổi tên.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
