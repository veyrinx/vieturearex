"use client";

import { useCallback, useState } from "react";
import { CircleDot, Clock, Loader2, Trophy } from "lucide-react";
import { usePolling } from "@/hooks/use-polling";

/**
 * Bảng theo dõi giải trực tiếp.
 *
 * Gọi lại mỗi 20 giây qua usePolling — hook đó tự dừng khi tab bị ẩn, nên một
 * tab bỏ quên không nã request cả ngày (mỗi request là một lần chạy function
 * tính tiền trên Vercel).
 */

const POLL_MS = 20_000;

interface Match {
  id: string;
  round: string;
  status: string;
  scheduled_at: string | null;
  team_a: string | null;
  team_b: string | null;
  team_a_id: string;
  team_b_id: string;
  winner_id: string | null;
}

interface Standing {
  team_id: string;
  team_name: string;
  team_tag: string;
  matches_played: number;
  wins: number;
  total_kills: number;
  total_points: number;
}

interface LiveData {
  tournament: { name: string; status: string };
  roundLabel: string | null;
  playing: Match[];
  upcoming: Match[];
  recent: Match[];
  standings: Standing[];
  fetchedAt: string;
}

function fmtTime(iso: string | null) {
  if (!iso) return "Chưa hẹn giờ";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Chưa hẹn giờ"
    : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function LiveBoard({ slug }: { slug: string }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tms/live/${slug}`);
      if (!res.ok) {
        setError("Không tải được dữ liệu giải.");
        return;
      }
      const json = (await res.json()) as LiveData;
      setData(json);
      setError(null);
      setUpdatedAt(new Date().toLocaleTimeString("vi-VN"));
    } catch {
      setError("Lỗi mạng — sẽ thử lại ở nhịp sau.");
    }
  }, [slug]);

  usePolling(refresh, POLL_MS);

  if (!data && !error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
          </span>
          Tự cập nhật mỗi {POLL_MS / 1000}s
          {updatedAt && <span className="font-normal opacity-70">· lần cuối {updatedAt}</span>}
        </p>
        {data.roundLabel && (
          <span className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
            {data.roundLabel}
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
          {error}
        </p>
      )}

      <Section
        icon={<CircleDot className="size-3.5 text-red-500" />}
        title="Đang thi đấu"
        empty="Chưa có trận nào đang diễn ra."
        matches={data.playing}
      />
      <Section
        icon={<Clock className="size-3.5 text-sky-500" />}
        title="Sắp tới"
        empty="Chưa xếp trận tiếp theo."
        matches={data.upcoming}
      />
      <Section
        icon={<Trophy className="size-3.5 text-emerald-500" />}
        title="Vừa xong"
        empty="Chưa có kết quả nào."
        matches={data.recent}
      />

      {data.standings.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Bảng xếp hạng đội</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">Đội</th>
                  <th className="py-1.5 pr-2 text-right">Trận</th>
                  <th className="py-1.5 pr-2 text-right">Thắng</th>
                  <th className="py-1.5 pr-2 text-right">Hạ gục</th>
                  <th className="py-1.5 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {data.standings.map((s, i) => (
                  <tr key={s.team_id} className="border-t border-border">
                    <td className="py-1.5 pr-2 font-black text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 pr-2 font-bold text-foreground">
                      {s.team_name}
                      {s.team_tag && <span className="ml-1 text-[10px] text-muted-foreground">[{s.team_tag}]</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right">{s.matches_played}</td>
                    <td className="py-1.5 pr-2 text-right">{s.wins}</td>
                    <td className="py-1.5 pr-2 text-right">{s.total_kills}</td>
                    <td className="py-1.5 text-right font-black text-primary">{s.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  empty,
  matches,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  matches: Match[];
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-foreground">
        {icon} {title}
      </p>
      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {matches.map((m) => {
            const aWon = m.winner_id === m.team_a_id;
            const bWon = m.winner_id === m.team_b_id;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                  <b className={aWon ? "text-emerald-500" : "text-foreground"}>{m.team_a ?? "?"}</b>
                  <span className="text-muted-foreground">vs</span>
                  <b className={bWon ? "text-emerald-500" : "text-foreground"}>{m.team_b ?? "?"}</b>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {m.status === "done" ? m.round : fmtTime(m.scheduled_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
