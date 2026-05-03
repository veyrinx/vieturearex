import { ImageResponse } from "next/og";
import { getTmsTournamentById, getTmsMatches } from "@/lib/tms/data";
import type { TmsMatch } from "@/lib/tms/types";

export const runtime = "nodejs";

const W = 1200, H = 675;
const BG      = "#090C14";
const SURFACE = "#10141f";
const BORDER  = "#1E2333";
const GOLD    = "#F59E0B";
const MUTED   = "#6B7280";
const GREEN   = "#10B981";
const WHITE   = "#F1F5F9";
const AMBER   = "#F59E0B";

const STATUS_COLOR: Record<string, string> = {
  pending:   MUTED,
  playing:   AMBER,
  done:      GREEN,
  cancelled: "#EF4444",
};

function MatchCard({ match, compact }: { match: TmsMatch; compact?: boolean }) {
  const aWon = match.winner_id === match.team_a_id;
  const bWon = match.winner_id === match.team_b_id;
  const ht = compact ? 36 : 44;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      border: `1px solid ${match.status === "playing" ? AMBER + "60" : BORDER}`,
      borderRadius: 10, overflow: "hidden", background: SURFACE,
      minWidth: compact ? 170 : 210,
    }}>
      <div style={{ height: 2, background: STATUS_COLOR[match.status] ?? MUTED }} />
      {[
        { team: match.team_a, won: aWon },
        { team: match.team_b, won: bWon },
      ].map(({ team, won }, ti) => (
        <div key={ti} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
          height: ht, background: won ? "rgba(16,185,129,0.08)" : "transparent",
          borderTop: ti === 1 ? `1px solid ${BORDER}` : "none",
        }}>
          {team?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={team.logo_url} style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "#1E2333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, color: MUTED }}>
              {team?.tag?.slice(0, 2) ?? "?"}
            </div>
          )}
          <span style={{
            fontSize: compact ? 11 : 13, fontWeight: won ? 700 : 500,
            color: won ? GREEN : team ? WHITE : MUTED,
            flex: 1, overflow: "hidden",
          }}>
            {team ? (team.name.length > (compact ? 14 : 18) ? team.name.slice(0, compact ? 11 : 15) + "…" : team.name) : "TBD"}
          </span>
          {won && <span style={{ fontSize: 8, fontWeight: 900, color: GREEN, letterSpacing: 1 }}>WIN</span>}
        </div>
      ))}
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tournament, allMatches] = await Promise.all([
    getTmsTournamentById(id).catch(() => null),
    getTmsMatches(id).catch(() => []),
  ]);

  const name = tournament?.name ?? "Giải Đấu";

  // Group by round
  const grouped = allMatches.reduce<Record<string, TmsMatch[]>>((acc, m) => {
    (acc[m.round] ??= []).push(m);
    return acc;
  }, {});
  const rounds = Object.entries(grouped);
  const totalMatches = allMatches.length;
  const doneMatches  = allMatches.filter((m) => m.status === "done").length;

  // Decide compact mode
  const compact = totalMatches > 12 || rounds.length > 4;
  const maxRoundsToShow = 5;
  const displayRounds = rounds.slice(0, maxRoundsToShow);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, background: BG, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg,#12172a,#0d1120)",
          borderBottom: `1px solid ${BORDER}`, padding: "22px 48px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: GOLD }}>
              🎮 LỊCH THI ĐẤU
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: -0.5, lineHeight: 1 }}>
              {name.length > 46 ? name.slice(0, 43) + "…" : name}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{doneMatches}</div>
              <div style={{ fontSize: 11, color: MUTED }}>/ {totalMatches} trận xong</div>
            </div>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: 2 }}>AREX TMS</div>
          </div>
        </div>

        {/* Content */}
        {allMatches.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 22 }}>
            Chưa có trận đấu nào
          </div>
        ) : (
          <div style={{ display: "flex", flex: 1, padding: "20px 32px", gap: 16, overflow: "hidden" }}>
            {displayRounds.map(([round, matches]) => (
              <div key={round} style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
                {/* Round header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: SURFACE, borderRadius: 8, padding: "6px 12px",
                  border: `1px solid ${BORDER}`,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: MUTED, textTransform: "uppercase", overflow: "hidden" }}>
                    {round.length > 18 ? round.slice(0, 15) + "…" : round}
                  </span>
                  <span style={{ fontSize: 10, color: matches.filter((m) => m.status === "done").length === matches.length ? GREEN : MUTED }}>
                    {matches.filter((m) => m.status === "done").length}/{matches.length}
                  </span>
                </div>
                {/* Match cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
                  {matches.slice(0, compact ? 4 : 5).map((m) => (
                    <MatchCard key={m.id} match={m} compact={compact} />
                  ))}
                  {matches.length > (compact ? 4 : 5) && (
                    <div style={{ fontSize: 10, color: MUTED, textAlign: "center", padding: "4px 0" }}>
                      +{matches.length - (compact ? 4 : 5)} trận nữa
                    </div>
                  )}
                </div>
              </div>
            ))}
            {rounds.length > maxRoundsToShow && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 80, color: MUTED, fontSize: 12 }}>
                +{rounds.length - maxRoundsToShow} vòng
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${BORDER}`, padding: "10px 48px", background: SURFACE,
        }}>
          <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>arexnetwork.site</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {[
              { color: MUTED,  label: "Chờ" },
              { color: AMBER,  label: "Đang đấu" },
              { color: GREEN,  label: "Xong" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
                <span style={{ fontSize: 10, color: MUTED }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
