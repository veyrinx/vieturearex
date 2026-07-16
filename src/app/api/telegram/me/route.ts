import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getUserAchievementIds } from "@/lib/server/award-achievement";
import { ACHIEVEMENTS_BY_ID } from "@/lib/constants/achievements";

// GET — Mini App lấy hồ sơ site đã liên kết (streak, điểm...) theo telegram id.
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-me", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) {
    return NextResponse.json({ linked: false, reason: resolved.reason });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ linked: false });

  const { data: link } = (await untypedFrom(db, "telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", resolved.user.id)
    .maybeSingle()) as { data: { user_id: string } | null };

  if (!link) return NextResponse.json({ linked: false });

  const { data: profile } = (await untypedFrom(db, "users")
    .select("display_name, avatar_url, login_streak, points, last_login_date")
    .eq("id", link.user_id)
    .maybeSingle()) as {
    data: { display_name: string | null; avatar_url: string | null; login_streak: number | null; points: number | null; last_login_date: string | null } | null;
  };

  const todayVN = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  ).toISOString().slice(0, 10);

  const earnedIds = await getUserAchievementIds(link.user_id).catch(() => []);
  const achievements = earnedIds
    .map((id) => ACHIEVEMENTS_BY_ID[id])
    .filter(Boolean)
    .map((a) => ({ id: a.id, name: a.name, icon: a.icon, rarity: a.rarity }));

  return NextResponse.json({
    linked: true,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    streak: profile?.login_streak ?? 0,
    points: profile?.points ?? 0,
    alreadyCheckedIn: profile?.last_login_date === todayVN,
    achievements,
  });
}
