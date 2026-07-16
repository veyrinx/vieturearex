import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

function todayInVN(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  ).toISOString().slice(0, 10);
}

// POST — điểm danh từ Mini App (dùng tài khoản đã liên kết). Logic streak giống /api/user/checkin.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-checkin", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) return NextResponse.json({ error: "Phiên Telegram không hợp lệ." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: link } = (await untypedFrom(db, "telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", resolved.user.id)
    .maybeSingle()) as { data: { user_id: string } | null };
  if (!link) return NextResponse.json({ error: "Chưa liên kết tài khoản.", needLink: true }, { status: 400 });

  const userId = link.user_id;
  const todayVN = todayInVN();

  const { data: row } = (await untypedFrom(db, "users")
    .select("login_streak, last_login_date")
    .eq("id", userId)
    .maybeSingle()) as { data: { login_streak: number | null; last_login_date: string | null } | null };

  const currentStreak = row?.login_streak ?? 0;
  const lastDate = row?.last_login_date;

  if (lastDate === todayVN) {
    return NextResponse.json({ ok: true, streak: currentStreak, alreadyCheckedIn: true });
  }

  let newStreak = 1;
  if (lastDate) {
    const yesterdayVN = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    if (lastDate === yesterdayVN) newStreak = currentStreak + 1;
  }

  await untypedFrom(db, "users")
    .update({ login_streak: newStreak, last_login_date: todayVN } as never)
    .eq("id", userId);

  try {
    await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown> })
      .rpc("increment_user_points", { uid: userId, amount: 2 });
  } catch { /* non-critical */ }

  void import("@/lib/server/award-achievement").then(({ checkLoginStreakAchievements }) =>
    checkLoginStreakAchievements(userId, newStreak).catch(() => null),
  );

  return NextResponse.json({ ok: true, streak: newStreak, alreadyCheckedIn: false });
}
