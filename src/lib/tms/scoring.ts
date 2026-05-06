const PLACEMENT_PTS = [12, 9, 7, 5, 4, 3, 2, 1, 1, 1, 1, 1]; // rank 1–12, rank 13+ = 0

export function getPlacementPoints(rank: number | null | undefined): number {
  if (!rank || rank < 1) return 0;
  return PLACEMENT_PTS[rank - 1] ?? 0;
}

export function getTotalScore(placement: number | null | undefined, kills: number): number {
  return getPlacementPoints(placement) + kills;
}

export const PLACEMENT_TABLE: { rank: string; pts: number }[] = [
  { rank: "#1",    pts: 12 },
  { rank: "#2",    pts: 9  },
  { rank: "#3",    pts: 7  },
  { rank: "#4",    pts: 5  },
  { rank: "#5",    pts: 4  },
  { rank: "#6",    pts: 3  },
  { rank: "#7",    pts: 2  },
  { rank: "#8–12", pts: 1  },
  { rank: "#13+",  pts: 0  },
];
