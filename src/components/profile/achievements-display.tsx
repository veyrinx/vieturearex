"use client";

import { ACHIEVEMENT_DEFS, ACHIEVEMENTS_BY_ID, RARITY_META, type AchievementRarity } from "@/lib/constants/achievements";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Lock } from "lucide-react";

type EarnedAchievement = {
  achievement: string;
  earned_at: string;
};

type Props = {
  earned: EarnedAchievement[];
  showLocked?: boolean;
};

export function AchievementsDisplay({ earned, showLocked = false }: Props) {
  const earnedMap = new Map(earned.map((e) => [e.achievement, e.earned_at]));
  const items = showLocked
    ? ACHIEVEMENT_DEFS
    : ACHIEVEMENT_DEFS.filter((a) => earnedMap.has(a.id));

  if (items.length === 0 && !showLocked) {
    return <p className="text-sm text-muted-foreground">Chưa có thành tích nào. Hãy khám phá thêm!</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((def) => {
        const isEarned = earnedMap.has(def.id);
        const earnedAt = earnedMap.get(def.id);
        const rarityMeta = RARITY_META[def.rarity as AchievementRarity];

        return (
          <div
            key={def.id}
            title={def.description}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border p-3 transition",
              isEarned
                ? cn("bg-muted/40", rarityMeta.bg)
                : "border-border bg-muted/20 opacity-40 grayscale",
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-xl leading-none">{isEarned ? def.icon : <Lock className="size-4 text-muted-foreground" />}</span>
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", isEarned ? rarityMeta.color : "text-muted-foreground")}>
                {rarityMeta.label}
              </span>
            </div>
            <div>
              <p className={cn("text-xs font-bold leading-tight", isEarned ? "text-foreground" : "text-muted-foreground")}>
                {isEarned ? def.name : "???"}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground line-clamp-2">
                {isEarned ? def.description : "Chưa mở khóa"}
              </p>
            </div>
            {isEarned && earnedAt && (
              <p className="text-[9px] text-muted-foreground/70">
                {format(new Date(earnedAt), "dd/MM/yyyy", { locale: vi })}
              </p>
            )}
            {isEarned && def.points > 0 && (
              <p className="text-[9px] font-semibold text-amber-500">+{def.points} điểm</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
