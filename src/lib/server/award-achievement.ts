import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";
import { createNotification } from "@/lib/server/notifications";
import { getCustomAchievements } from "@/lib/server/achievements";
import { ACHIEVEMENTS_BY_ID, type AchievementDef } from "@/lib/constants/achievements";

function getAdmin() {
  return createAdminSupabaseClient();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Resolve def cho 1 id: ưu tiên code, sau đó custom (settings). */
async function resolveDef(achievementId: string): Promise<AchievementDef | undefined> {
  const code = ACHIEVEMENTS_BY_ID[achievementId];
  if (code) return code;
  const custom = await getCustomAchievements();
  return custom.find((d) => d.id === achievementId);
}

/**
 * Award an achievement to a user. Safe to call multiple times — duplicate is ignored.
 * Chấp nhận cả huy hiệu code lẫn custom. Returns true if newly awarded.
 */
export async function awardAchievement(userId: string, achievementId: string): Promise<boolean> {
  const admin = getAdmin();
  if (!admin) return false;

  const def = await resolveDef(achievementId);
  if (!def) return false;

  const { error } = await untypedFrom(admin, "user_achievements")
    .insert({ user_id: userId, achievement: achievementId });

  if (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === "23505") return false; // already earned
    console.error("[award-achievement]", achievementId, e.message);
    return false;
  }

  // Award bonus points if achievement has points reward
  if (def.points > 0) {
    await (admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: userId, amount: def.points });
  }

  // Thông báo cho người nhận (in-app + Telegram nếu đã liên kết) — best-effort.
  void notifyAchievementEarned(userId, def).catch(() => null);

  return true;
}

/** Thông báo khi user nhận huy hiệu mới: inbox trong web + DM Telegram. */
async function notifyAchievementEarned(userId: string, def: AchievementDef): Promise<void> {
  await createNotification({
    user_id: userId,
    type: "achievement",
    title: `🏆 Mở khóa huy hiệu: ${def.name}`,
    body: def.description || undefined,
    entity_type: "achievement",
    entity_id: def.id,
    entity_url: `/u/${userId}`,
  });

  try {
    const admin = getAdmin();
    if (!admin) return;
    const { data: link } = (await untypedFrom(admin, "telegram_account_links")
      .select("telegram_user_id")
      .eq("user_id", userId)
      .maybeSingle()) as { data: { telegram_user_id: number } | null };
    if (!link) return;

    const settings = await getSettings();
    const token = settings.find((s) => s.key === "integrations.telegram_bot_token")?.value;
    if (!token) return;

    const text =
      `🏆 <b>Mở khóa huy hiệu mới!</b>\n\n${def.icon} <b>${escapeHtml(def.name)}</b>` +
      (def.description ? `\n${escapeHtml(def.description)}` : "") +
      (def.points > 0 ? `\n\n<b>+${def.points} điểm</b>` : "");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: link.telegram_user_id, text, parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => null);
  } catch {
    // best-effort
  }
}

/**
 * Tự động trao các huy hiệu custom có điều kiện (điểm / chuỗi điểm danh) khi user
 * đạt ngưỡng. Gọi ở nơi cập nhật điểm/streak (vd điểm danh). Best-effort.
 */
export async function evaluateAutoAchievements(userId: string): Promise<void> {
  const custom = await getCustomAchievements();
  const autos = custom.filter((d) => d.auto);
  if (autos.length === 0) return;

  const admin = getAdmin();
  if (!admin) return;

  const { data: u } = (await untypedFrom(admin, "users")
    .select("points, login_streak")
    .eq("id", userId)
    .maybeSingle()) as { data: { points: number | null; login_streak: number | null } | null };
  if (!u) return;

  const value: Record<string, number> = { points: u.points ?? 0, streak: u.login_streak ?? 0 };
  for (const d of autos) {
    if (d.auto && value[d.auto.metric] >= d.auto.threshold) {
      await awardAchievement(userId, d.id);
    }
  }
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
