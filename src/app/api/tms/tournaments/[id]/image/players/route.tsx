import { ImageResponse } from "next/og";
import { getTmsTournamentById, getTmsPlayerLeaderboard } from "@/lib/tms/data";

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

  const [tournament, players] = await Promise.all([
    getTmsTournamentById(id).catch(() => null),
    getTmsPlayerLeaderboard(id).catch(() => []),
  ]);

  const name = tournament?.name ?? "Giải Đấu";
  const rows = players.slice(0, 9);

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
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#60A5FA" }}>
              ⚡ BXH CÁ NHÂN
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
          padding: "8px 48px",
        }}>
          {[
            { label: "#",      w: 52  },
            { label: "Người chơi", w: 240 },
            { label: "FF ID",  w: 130 },
            { label: "Đội",    w: 130 },
            { label: "Trận",   w: 70  },
            { label: "Kills",  w: 80  },
            { label: "A",      w: 60  },
            { label: "D",      w: 60  },
            { label: "K/D",    w: 80  },
            { label: "Điểm",   w: 100 },
          ].map(({ label, w }) => (
            <div key={label} style={{ width: w, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED }}>
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
          ) : rows.map((p, i) => {
            const isTop3 = i < 3;
            const rowBg = isTop3
              ? `rgba(245,158,11,${0.07 - i * 0.015})`
              : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.018)";

            return (
              <div key={p.user_id} style={{
                display: "flex", alignItems: "center",
                background: rowBg, borderBottom: `1px solid rgba(30,35,51,0.6)`,
                padding: "9px 48px",
              }}>
                <div style={{ width: 52, fontSize: isTop3 ? 20 : 14, fontWeight: 800, color: isTop3 ? GOLD : MUTED }}>
                  {isTop3 ? medals[i] : i + 1}
                </div>
                <div style={{ width: 240 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isTop3 ? WHITE : "#D1D5DB", lineHeight: 1 }}>
                    {(p.display_name ?? "Ẩn danh").slice(0, 20)}
                  </div>
                </div>
                <div style={{ width: 130, fontSize: 11, fontFamily: "monospace", color: "#F59E0B99" }}>
                  {p.ff_id ? p.ff_id.slice(0, 12) : "—"}
                </div>
                <div style={{ width: 130, fontSize: 11, color: MUTED }}>
                  [{p.team_tag}]
                </div>
                <div style={{ width: 70, fontSize: 14, color: MUTED }}>{p.matches_played}</div>
                <div style={{ width: 80, fontSize: 16, fontWeight: 700, color: RED }}>{p.total_kills}</div>
                <div style={{ width: 60, fontSize: 14, color: "#60A5FA" }}>{p.total_assists}</div>
                <div style={{ width: 60, fontSize: 14, color: MUTED }}>{p.total_deaths}</div>
                <div style={{ width: 80, fontSize: 14, fontFamily: "monospace", color: p.kd_ratio >= 3 ? GREEN : p.kd_ratio >= 1.5 ? GOLD : MUTED }}>
                  {p.kd_ratio}
                </div>
                <div style={{ width: 100, fontSize: 20, fontWeight: 900, color: GOLD }}>{p.total_points}</div>
              </div>
            );
          })}
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${BORDER}`, padding: "12px 48px", background: SURFACE,
        }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>arexnetwork.site</div>
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
