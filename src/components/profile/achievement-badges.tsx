"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { RARITY_META, type AchievementRarity } from "@/lib/constants/achievements";
import { cn } from "@/lib/utils";

export type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  points: number;
  earnedAt: string;
};

// Hiếm hơn xếp trước để huy hiệu "xịn" hiện đầu hàng.
const RANK: Record<AchievementRarity, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };

/**
 * Dải huy hiệu thành tích dạng icon — bấm 1 cái để hiện tên + mô tả nhỏ.
 * Thay cho bảng thành tích cồng kềnh; hoạt động tốt trên cả điện thoại (tap).
 * Hỗ trợ cả huy hiệu code lẫn loại tuỳ chỉnh do admin tạo (đã resolve sẵn ở server).
 */
export function AchievementBadges({ items }: { items: BadgeItem[] }) {
  const [sel, setSel] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
  if (sorted.length === 0) return null;

  const selItem = sorted.find((i) => i.id === sel) ?? null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((it) => {
          const meta = RARITY_META[it.rarity];
          const active = sel === it.id;
          return (
            <button
              key={it.id}
              type="button"
              title={it.name}
              aria-pressed={active}
              aria-label={it.name}
              onClick={() => setSel(active ? null : it.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl border text-lg transition hover:scale-105",
                meta.bg,
                active
                  ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-card scale-105 dark:ring-amber-400/60"
                  : "opacity-90 hover:opacity-100",
              )}
            >
              <span aria-hidden>{it.icon}</span>
            </button>
          );
        })}
      </div>

      {selItem ? (
        <div className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2", RARITY_META[selItem.rarity].bg)}>
          <span className="text-xl leading-none">{selItem.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold leading-tight text-foreground">
              {selItem.name}
              <span className={cn("text-[9px] font-bold uppercase tracking-widest", RARITY_META[selItem.rarity].color)}>
                {RARITY_META[selItem.rarity].label}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
              {selItem.description}
              {selItem.description ? " · " : ""}
              {format(new Date(selItem.earnedAt), "dd/MM/yyyy", { locale: vi })}
            </p>
          </div>
          {selItem.points > 0 && (
            <span className="shrink-0 text-xs font-bold text-amber-500">+{selItem.points}đ</span>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/70">Bấm vào huy hiệu để xem tên thành tích.</p>
      )}
    </div>
  );
}
