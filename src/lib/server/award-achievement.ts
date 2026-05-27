import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ACHIEVEMENTS_BY_ID } from "@/lib/constants/achievements";

function getAdmin() {
  return createAdminSupabaseClient();
}

/**
 * Award an achievement to a user. Safe to call multiple times — duplicate is ignored.
 * Returns true if newly awarded.
 */
export async function awardAchievement(userId: string, achievementId: string): Promise<boolean> {
  const admin = getAdmin();
  if (!admin || !ACHIEVEMENTS_BY_ID[achievementId]) return false;

  const { error } = await untypedFrom(admin, "user_achievements")
    .insert({ user_id: userId, achievement: achievementId });

  if (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === "23505") return false; // already earned
    console.error("[award-achievement]", achievementId, e.message);
    return false;
  }

  // Award bonus points if achievement has points reward
  const def = ACHIEVEMENTS_BY_ID[achievementId];
  if (def.points > 0) {
    await (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: userId, amount: def.points });
  }

  return true;
}

/**
 * Check and award rank-based achievements based on current points.
 */
export async function checkRankAchievements(userId: string, points: number) {
  if (points >= 10000) await awardAchievement(userId, "master_rank");
  else if (points >= 5000) await awardAchievement(userId, "diamond_rank");
  else if (points >= 500) await awardAchievement(userId, "gold_rank");
}

/**
 * Check profile completion and social link achievements.
 */
export async function checkProfileAchievements(
  userId: string,
  profile: {
    avatar_url?: string | null;
    bio?: string | null;
    ff_id?: string | null;
    socialCount: number;
  },
) {
  const { avatar_url, bio, ff_id, socialCount } = profile;
  if (avatar_url && bio && ff_id) {
    await awardAchievement(userId, "profile_complete");
  }
  if (socialCount >= 2) {
    await awardAchievement(userId, "social_linked");
  }
}

/**
 * Get all achievement IDs earned by a user.
 */
export async function getUserAchievementIds(userId: string): Promise<string[]> {
  const admin = getAdmin();
  if (!admin) return [];

  const { data } = await untypedFrom(admin, "user_achievements")
    .select("achievement")
    .eq("user_id", userId) as { data: { achievement: string }[] | null };

  return (data ?? []).map((r) => r.achievement);
}
