import { getGlobalPlayerLeaderboard } from "@/lib/tms/data";

const medals = ["🥇", "🥈", "🥉"];

export default async function TgLeaderboardPage() {
  const players = await getGlobalPlayerLeaderboard(20).catch(() => []);

  return (
    <div className="flex flex-col gap-3 p-4 pb-20">
      <h1 className="font-bold text-base">🏆 Bảng Xếp Hạng</h1>
      <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-xs">
        Top tuyển thủ tổng hợp từ tất cả giải đấu Arex
      </p>

      {players.length === 0 ? (
        <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-sm text-center py-10">
          Chưa có dữ liệu giải đấu.
        </p>
      ) : (
        <div className="space-y-2">
          {players.map((p, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return (
              <div
                key={p.user_id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: "var(--tg-theme-secondary-bg-color,#111)",
                  border: rank === 1 ? "1px solid rgba(251,191,36,0.3)" : "none",
                }}
              >
                <span className={isTop3 ? "text-lg w-6 text-center" : "text-xs font-mono font-bold w-6 text-center"} style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                  {isTop3 ? medals[rank - 1] : rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.display_name ?? "—"}</p>
                  {p.ff_id && (
                    <p className="text-[11px] font-mono" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                      FF: {p.ff_id}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: "var(--tg-theme-button-color,#f97316)" }}>
                    {p.total_points.toLocaleString()} điểm
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                    {p.total_kills} kills · {p.matches_played} trận
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
