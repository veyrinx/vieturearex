import { ImageResponse } from "next/og";
import { getTmsTournamentById, getTmsTeamLeaderboard } from "@/lib/tms/data";

export const runtime = "nodejs";

const W = 1200, H = 675;
const BG      = "#090C14";
const SURFACE = "#10141f";
const BORDER  = "#1E2333";
const GOLD    = "#F59E0B";
const MUTED   = "#6B7280";
const GREEN   = "#10B981";
const RED     = "#EF4444";
const WHITE   = "#F1F5F9";

const medals = ["🥇", "🥈", "🥉"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tournament, teams] = await Promise.all([
    getTmsTournamentById(id).catch(() => null),
    getTmsTeamLeaderboard(id).catch(() => []),
  ]);

  const name = tournament?.name ?? "Giải Đấu";
  const rows = teams.slice(0, 9);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, background: BG, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg,#12172a,#0d1120)",
          borderBottom: `1px solid ${BORDER}`, padding: "28px 48px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: GOLD }}>
                🏆 BẢNG XẾP HẠNG ĐỘI
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: WHITE, letterSpacing: -0.5, lineHeight: 1 }}>
              {name.length > 42 ? name.slice(0, 39) + "…" : name}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 3, textTransform: "uppercase" }}>AREX TMS</div>
            <div style={{ fontSize: 11, color: MUTED }}>arexnetwork.site</div>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: "flex", alignItems: "center",
          background: SURFACE, borderBottom: `1px solid ${BORDER}`,
          padding: "8px 48px", gap: 0,
        }}>
          {[
            { label: "#",      w: 52,  align: "center" },
            { label: "ĐỘI",   w: 300, align: "left" },
            { label: "TRẬN",  w: 80,  align: "center" },
            { label: "THẮNG", w: 90,  align: "center" },
            { label: "THUA",  w: 80,  align: "center" },
            { label: "KILLS", w: 90,  align: "center" },
            { label: "ĐIỂM",  w: 100, align: "center" },
          ].map(({ label, w, align }) => (
            <div key={label} style={{ width: w, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, textAlign: align as "center" | "left" }}>
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {rows.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 20 }}>
              Chưa có kết quả thi đấu
            </div>
          ) : rows.map((t, i) => {
            const isTop3 = i < 3;
            const rowBg = isTop3
              ? `rgba(245,158,11,${0.07 - i * 0.015})`
              : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.018)";
            const winRate = t.matches_played > 0 ? Math.round((t.wins / t.matches_played) * 100) : 0;

            return (
              <div key={t.team_id} style={{
                display: "flex", alignItems: "center",
                background: rowBg, borderBottom: `1px solid rgba(30,35,51,0.6)`,
                padding: "10px 48px", gap: 0,
              }}>
                {/* Rank */}
                <div style={{ width: 52, fontSize: isTop3 ? 20 : 15, fontWeight: 800, textAlign: "center", color: isTop3 ? GOLD : MUTED }}>
                  {isTop3 ? medals[i] : i + 1}
                </div>
                {/* Team */}
                <div style={{ width: 300, display: "flex", alignItems: "center", gap: 10 }}>
                  {t.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                    <img src={t.logo_url} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: MUTED }}>
                      {t.team_tag.slice(0, 2)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: isTop3 ? WHITE : "#D1D5DB", lineHeight: 1 }}>
                      {t.team_name.length > 18 ? t.team_name.slice(0, 15) + "…" : t.team_name}
                    </span>
                    <span style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>[{t.team_tag}]</span>
                  </div>
                </div>
                {/* Matches */}
                <div style={{ width: 80, textAlign: "center", fontSize: 15, color: MUTED }}>{t.matches_played}</div>
                {/* Wins */}
                <div style={{ width: 90, textAlign: "center", fontSize: 15, fontWeight: 700, color: GREEN }}>
                  {t.wins} <span style={{ fontSize: 10, color: "rgba(16,185,129,0.6)" }}>({winRate}%)</span>
                </div>
                {/* Losses */}
                <div style={{ width: 80, textAlign: "center", fontSize: 15, color: RED }}>{t.losses}</div>
                {/* Kills */}
                <div style={{ width: 90, textAlign: "center", fontSize: 15, color: "#F87171" }}>{t.total_kills}</div>
                {/* Points */}
                <div style={{ width: 100, textAlign: "center", fontSize: 22, fontWeight: 900, color: GOLD }}>
                  {t.total_points}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${BORDER}`, padding: "12px 48px",
          background: SURFACE,
        }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>
            arexnetwork.site
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: GOLD }} />
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>Free Fire Community</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
