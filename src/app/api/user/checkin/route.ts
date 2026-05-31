import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { untypedFrom } from "@/lib/supabase/untyped";

// Called once per session to track daily login + award streak achievements.
// Returns quickly — all heavy work is fire-and-forget.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "user-checkin", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ ok: false });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ ok: false });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false });

  const todayVN = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  ).toISOString().slice(0, 10);

  // Fetch current streak data
  const { data: row } = await untypedFrom(db, "users")
    .select("login_streak, last_login_date")
    .eq("id", user.id)
    .single() as { data: { login_streak: number | null; last_login_date: string | null } | null };

  const lastDate = row?.last_login_date;
  const currentStreak = row?.login_streak ?? 0;

  // Already checked in today
  if (lastDate === todayVN) return NextResponse.json({ ok: true, streak: currentStreak, alreadyCheckedIn: true });

  // Calculate new streak
  let newStreak = 1;
  if (lastDate) {
    const yesterdayVN = new Date(Date.now() - 86_400_000)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); // "YYYY-MM-DD"
    if (lastDate === yesterdayVN) {
      newStreak = currentStreak + 1;
    }
    // else gap > 1 day → reset to 1
  }

  // Update streak
  await untypedFrom(db, "users")
    .update({ login_streak: newStreak, last_login_date: todayVN } as never)
    .eq("id", user.id);

  // Award points for daily login
  try {
    await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: user.id, amount: 2 });
  } catch { /* non-critical */ }

  // Check streak achievements (fire-and-forget)
  void import("@/lib/server/award-achievement").then(({ checkLoginStreakAchievements }) =>
    checkLoginStreakAchievements(user.id, newStreak).catch(() => null)
  );

  return NextResponse.json({ ok: true, streak: newStreak, alreadyCheckedIn: false });
}
