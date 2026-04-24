export type Rank = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";

export const RANK_TIERS: { rank: Rank; min: number; color: string; bg: string }[] = [
  { rank: "Bronze",   min: 0,     color: "text-amber-700",   bg: "bg-amber-700/10 border-amber-700/30" },
  { rank: "Silver",   min: 100,   color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/30" },
  { rank: "Gold",     min: 500,   color: "text-yellow-500",  bg: "bg-yellow-500/10 border-yellow-500/30" },
  { rank: "Platinum", min: 1000,  color: "text-cyan-400",    bg: "bg-cyan-400/10 border-cyan-400/30" },
  { rank: "Diamond",  min: 5000,  color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/30" },
  { rank: "Master",   min: 10000, color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/30" },
];

export function getRank(points: number): (typeof RANK_TIERS)[number] {
  return [...RANK_TIERS].reverse().find((t) => points >= t.min) ?? RANK_TIERS[0];
}

// Points awarded per action
export const POINTS = {
  COMMENT_APPROVED: 5,
  ARTICLE_VIEW: 1,
  DAILY_LOGIN: 2,
} as const;
