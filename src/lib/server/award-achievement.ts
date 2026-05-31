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

// ── Rank achievements ──────────────────────────────────────────────────────

export async function checkRankAchievements(userId: string, points: number) {
  if (points >= 50_000) await awardAchievement(userId, "challenger_rank");
  if (points >= 25_000) await awardAchievement(userId, "grandmaster_rank");
  if (points >= 10_000) await awardAchievement(userId, "master_rank");
  if (points >= 5_000)  await awardAchievement(userId, "diamond_rank");
  if (points >= 1_000)  await awardAchievement(userId, "platinum_rank");
  if (points >= 500)    await awardAchievement(userId, "gold_rank");
  if (points >= 100)    await awardAchievement(userId, "silver_rank");
}

// ── Profile achievements ───────────────────────────────────────────────────

export async function checkProfileAchievements(
  userId: string,
  profile: {
    avatar_url?: string | null;
    bio?: string | null;
    ff_id?: string | null;
    socialCount: number;
    followCount?: number;
  },
) {
  const { avatar_url, bio, ff_id, socialCount, followCount = 0 } = profile;
  if (avatar_url && bio && ff_id) await awardAchievement(userId, "profile_complete");
  if (socialCount >= 2) await awardAchievement(userId, "social_linked");
  if (followCount >= 1) await awardAchievement(userId, "first_follow");
  if (followCount >= 5) await awardAchievement(userId, "followed_5");
}

// ── Forum achievements ─────────────────────────────────────────────────────

export async function checkForumAchievements(userId: string, totalPosts: number, totalReplies: number) {
  if (totalPosts >= 1)   await awardAchievement(userId, "forum_first_post");
  if (totalPosts >= 10)  await awardAchievement(userId, "forum_10_posts");
  if (totalPosts >= 50)  await awardAchievement(userId, "forum_50_posts");
  if (totalPosts >= 100) await awardAchievement(userId, "forum_100_posts");
  if (totalReplies >= 1) await awardAchievement(userId, "forum_first_reply");
}

export async function checkForumPopularAchievement(userId: string, replyCount: number) {
  if (replyCount >= 10) await awardAchievement(userId, "forum_popular");
}

// ── Wiki achievements ──────────────────────────────────────────────────────

export async function checkWikiAchievements(userId: string, totalPublished: number) {
  if (totalPublished >= 1)  await awardAchievement(userId, "wiki_first_article");
  if (totalPublished >= 3)  await awardAchievement(userId, "wiki_3_articles");
  if (totalPublished >= 10) await awardAchievement(userId, "wiki_10_articles");
}

// ── Tournament achievements ────────────────────────────────────────────────

export async function checkTournamentAchievements(
  userId: string,
  stats: {
    tournamentsPlayed: number;
    totalWins: number;
    totalKills: number;
    hasTop3: boolean;
  },
) {
  const { tournamentsPlayed, totalWins, totalKills, hasTop3 } = stats;
  if (tournamentsPlayed >= 1)  await awardAchievement(userId, "tournament_debut");
  if (tournamentsPlayed >= 5)  await awardAchievement(userId, "tms_5_tournaments");
  if (tournamentsPlayed >= 10) await awardAchievement(userId, "tms_10_tournaments");
  if (totalWins >= 1)          await awardAchievement(userId, "tms_first_win");
  if (totalWins >= 10)         await awardAchievement(userId, "tms_10_wins");
  if (totalKills >= 100)       await awardAchievement(userId, "tms_100_kills");
  if (totalKills >= 500)       await awardAchievement(userId, "tms_500_kills");
  if (totalKills >= 1000)      await awardAchievement(userId, "tms_1000_kills");
  if (hasTop3)                 await awardAchievement(userId, "tms_top_3");
}

// ── Content achievements ───────────────────────────────────────────────────

export async function checkContentAchievements(userId: string, viewCount: number, bookmarkCount: number) {
  if (viewCount >= 10)   await awardAchievement(userId, "reader_10");
  if (viewCount >= 50)   await awardAchievement(userId, "reader_50");
  if (viewCount >= 100)  await awardAchievement(userId, "reader_100");
  if (bookmarkCount >= 5)  await awardAchievement(userId, "bookmarker");
  if (bookmarkCount >= 20) await awardAchievement(userId, "bookmarker_20");
}

// ── Loyalty achievements ───────────────────────────────────────────────────

export async function checkLoginStreakAchievements(userId: string, streakDays: number) {
  if (streakDays >= 7)  await awardAchievement(userId, "login_7_days");
  if (streakDays >= 30) await awardAchievement(userId, "login_30_days");
}

// ── Util ──────────────────────────────────────────────────────────────────

export async function getUserAchievementIds(userId: string): Promise<string[]> {
  const admin = getAdmin();
  if (!admin) return [];

  const { data } = await untypedFrom(admin, "user_achievements")
    .select("achievement")
    .eq("user_id", userId) as { data: { achievement: string }[] | null };

  return (data ?? []).map((r) => r.achievement);
}
