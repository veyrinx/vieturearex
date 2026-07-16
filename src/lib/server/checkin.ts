import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export function todayInVN(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  ).toISOString().slice(0, 10);
}

// Điểm danh cho 1 user site: cập nhật chuỗi + cộng điểm + xét thành tựu.
// Trả về trạng thái sau điểm danh, hoặc null nếu DB lỗi.
export async function performCheckin(
  userId: string,
): Promise<{ streak: number; alreadyCheckedIn: boolean } | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const todayVN = todayInVN();

  const { data: row } = (await untypedFrom(db, "users")
    .select("login_streak, last_login_date")
    .eq("id", userId)
    .maybeSingle()) as { data: { login_streak: number | null; last_login_date: string | null } | null };

  const currentStreak = row?.login_streak ?? 0;
  const lastDate = row?.last_login_date;

  if (lastDate === todayVN) return { streak: currentStreak, alreadyCheckedIn: true };

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

  return { streak: newStreak, alreadyCheckedIn: false };
}
