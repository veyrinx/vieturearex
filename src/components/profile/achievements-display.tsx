"use client";

import { useState } from "react";
import {
  ACHIEVEMENT_DEFS, RARITY_META,
  ACHIEVEMENT_CATEGORIES,
  type AchievementRarity, type AchievementCategory, type AchievementDef,
} from "@/lib/constants/achievements";
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
  /** Huy hiệu tuỳ chỉnh admin tạo (gộp thêm vào danh mục mặc định). */
  customDefs?: AchievementDef[];
};

const RARITY_FILTER_ORDER: ("all" | AchievementRarity)[] = [
  "all", "legendary", "epic", "rare", "uncommon", "common",
];

export function AchievementsDisplay({ earned, showLocked = true, customDefs = [] }: Props) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const [activeRarity, setActiveRarity] = useState<AchievementRarity | "all">("all");

  const allDefs = customDefs.length ? [...ACHIEVEMENT_DEFS, ...customDefs] : ACHIEVEMENT_DEFS;
  const allById = new Map(allDefs.map((d) => [d.id, d]));

  const earnedMap = new Map(earned.map((e) => [e.achievement, e.earned_at]));

  const visibleDefs = allDefs.filter((a) => {
    if (a.hidden && !earnedMap.has(a.id)) return false;
    if (!showLocked && !earnedMap.has(a.id)) return false;
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (activeRarity !== "all" && a.rarity !== activeRarity) return false;
    return true;
  });

  const earnedCount = earned.filter((e) => allById.has(e.achievement)).length;
  const totalVisible = allDefs.filter((a) => !a.hidden).length;

  const categories = (["all", ...Object.keys(ACHIEVEMENT_CATEGORIES)] as ("all" | AchievementCategory)[]);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Tiến trình</span>
          <span className="text-xs font-bold text-primary dark:text-amber-400">
            {earnedCount} / {totalVisible}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 dark:from-amber-400 dark:to-amber-500 transition-all duration-500"
            style={{ width: `${Math.round((earnedCount / totalVisible) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {Math.round((earnedCount / totalVisible) * 100)}% hoàn thành
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const meta = cat === "all" ? null : ACHIEVEMENT_CATEGORIES[cat];
          const label = cat === "all" ? "Tất cả" : meta?.label ?? cat;
          const icon = meta?.icon ?? "🏅";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground dark:bg-amber-500 dark:text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {cat !== "all" && <span>{icon}</span>}
              {label}
            </button>
          );
        })}
      </div>

      {/* Rarity filter */}
      <div className="flex flex-wrap gap-1">
        {RARITY_FILTER_ORDER.map((r) => {
          const meta = r === "all" ? null : RARITY_META[r];
          return (
            <button
              key={r}
              onClick={() => setActiveRarity(r)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase transition",
                activeRarity === r
                  ? r === "all"
                    ? "border-border bg-muted text-foreground"
                    : cn("border", meta?.bg, meta?.color)
                  : "border-transparent text-muted-foreground hover:bg-muted",
              )}
            >
              {r === "all" ? "Tất cả độ hiếm" : meta?.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visibleDefs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Không có thành tựu</p>
          <p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc để xem thêm</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleDefs.map((def) => {
            const isEarned = earnedMap.has(def.id);
            const earnedAt = earnedMap.get(def.id);
            const rarityMeta = RARITY_META[def.rarity as AchievementRarity];
            const catMeta = ACHIEVEMENT_CATEGORIES[def.category];

            return (
              <div
                key={def.id}
                title={def.description}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3 transition",
                  isEarned
                    ? cn("bg-muted/40", rarityMeta.bg, rarityMeta.glow && `shadow-md ${rarityMeta.glow}`)
                    : "border-border bg-muted/10 opacity-50 grayscale",
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xl leading-none">
                    {isEarned ? def.icon : <Lock className="size-4 text-muted-foreground" />}
                  </span>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest",
                      isEarned ? rarityMeta.color : "text-muted-foreground",
                    )}>
                      {rarityMeta.label}
                    </span>
                    <span className="text-[8px] text-muted-foreground/70">{catMeta.icon}</span>
                  </div>
                </div>
                <div>
                  <p className={cn("text-xs font-bold leading-tight", isEarned ? "text-foreground" : "text-muted-foreground")}>
                    {isEarned ? def.name : "???"}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground line-clamp-2">
                    {isEarned ? def.description : "Chưa mở khóa"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-1 mt-auto">
                  {isEarned && earnedAt && (
                    <p className="text-[9px] text-muted-foreground/70">
                      {format(new Date(earnedAt), "dd/MM/yy", { locale: vi })}
                    </p>
                  )}
                  {isEarned && def.points > 0 && (
                    <p className="text-[9px] font-semibold text-amber-500 ml-auto">+{def.points}đ</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
