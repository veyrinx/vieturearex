import "server-only";
import { getSettings } from "@/lib/data/content-service";
import {
  ACHIEVEMENTS_BY_ID,
  SETTINGS_KEY_CUSTOM_ACHIEVEMENTS,
  parseCustomAchievements,
  mergeAchievementsById,
  type AchievementDef,
} from "@/lib/constants/achievements";

/** Danh sách huy hiệu tuỳ chỉnh admin đã tạo (từ settings). */
export async function getCustomAchievements(): Promise<AchievementDef[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_CUSTOM_ACHIEVEMENTS);
    return parseCustomAchievements(row?.value ?? null);
  } catch {
    return [];
  }
}

/** Map id → def, gộp cả code lẫn custom. */
export async function getMergedAchievementsById(): Promise<Record<string, AchievementDef>> {
  const custom = await getCustomAchievements();
  return mergeAchievementsById(custom);
}

export type ResolvedAchievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementDef["rarity"];
  points: number;
  earnedAt: string;
};

/**
 * Đổi danh sách achievement đã đạt (id + earned_at) thành def đầy đủ để hiển thị.
 * Bỏ qua id không còn định nghĩa. Nhận sẵn map để caller tự quyết cache/merge.
 */
export function resolveEarned(
  earned: Array<{ achievement: string; earned_at: string }>,
  byId: Record<string, AchievementDef> = ACHIEVEMENTS_BY_ID,
): ResolvedAchievement[] {
  const out: ResolvedAchievement[] = [];
  for (const e of earned) {
    const def = byId[e.achievement];
    if (!def) continue;
    out.push({
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      points: def.points,
      earnedAt: e.earned_at,
    });
  }
  return out;
}
