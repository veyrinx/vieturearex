export type Rank =
  | "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master"
  | "Grandmaster" | "Challenger";

export type SubRank = "III" | "II" | "I";

export const RANK_TIERS: {
  rank: Rank;
  min: number;
  color: string;
  bg: string;
  icon: string;
}[] = [
  { rank: "Bronze",      min: 0,      color: "text-amber-700",   bg: "bg-amber-700/10 border-amber-700/30",     icon: "🥉" },
  { rank: "Silver",      min: 100,    color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/30",     icon: "🥈" },
  { rank: "Gold",        min: 500,    color: "text-yellow-500",  bg: "bg-yellow-500/10 border-yellow-500/30",   icon: "🥇" },
  { rank: "Platinum",    min: 1_000,  color: "text-cyan-400",    bg: "bg-cyan-400/10 border-cyan-400/30",       icon: "💠" },
  { rank: "Diamond",     min: 5_000,  color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/30",       icon: "💎" },
  { rank: "Master",      min: 10_000, color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/30",       icon: "👑" },
  { rank: "Grandmaster", min: 25_000, color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-500/30",   icon: "🔮" },
  { rank: "Challenger",  min: 50_000, color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30",     icon: "⚡" },
];

export function getRank(points: number): (typeof RANK_TIERS)[number] {
  return [...RANK_TIERS].reverse().find((t) => points >= t.min) ?? RANK_TIERS[0];
}

/** Returns sub-rank (I/II/III) within a tier based on progress to next tier */
export function getSubRank(points: number): SubRank {
  const current = getRank(points);
  const idx = RANK_TIERS.findIndex((t) => t.rank === current.rank);
  const next = RANK_TIERS[idx + 1];
  if (!next) return "I"; // Max rank, always I
  const range = next.min - current.min;
  const progress = points - current.min;
  const pct = progress / range;
  if (pct >= 0.67) return "I";
  if (pct >= 0.33) return "II";
  return "III";
}

/** Progress percentage (0–100) toward next tier */
export function getRankProgress(points: number): number {
  const current = getRank(points);
  const idx = RANK_TIERS.findIndex((t) => t.rank === current.rank);
  const next = RANK_TIERS[idx + 1];
  if (!next) return 100;
  const range = next.min - current.min;
  return Math.min(100, Math.round(((points - current.min) / range) * 100));
}

/** Points needed to reach the next tier */
export function getPointsToNextRank(points: number): number | null {
  const current = getRank(points);
  const idx = RANK_TIERS.findIndex((t) => t.rank === current.rank);
  const next = RANK_TIERS[idx + 1];
  if (!next) return null;
  return Math.max(0, next.min - points);
}

// Points awarded per action
export const POINTS = {
  COMMENT_APPROVED:      5,
  ARTICLE_VIEW:          1,
  DAILY_LOGIN:           2,
  FORUM_POST:           10,
  FORUM_REPLY:           5,
  WIKI_PUBLISHED:       30,
  WIKI_EDITED:           5,
  TOURNAMENT_WIN:       20,
  TOURNAMENT_TOP3:      10,
  RATING_GIVEN:          3,
  EVENT_BOOKMARKED:      2,
} as const;
