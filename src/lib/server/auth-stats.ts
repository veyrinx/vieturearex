import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/content-service";
import { vnDateKey } from "@/lib/server/vn-date";

const BLOCKED_IPS_KEY = "security.blocked_ips";

export type LoginMethod = "password" | "google" | "facebook" | "other";

export type AuthDayStats = {
  /** Tổng lượt đăng nhập ghi nhận trong ngày. */
  total: number;
  /** Số tài khoản khác nhau đã đăng nhập trong ngày. */
  uniqueUsers: number;
  byMethod: Record<LoginMethod, number>;
};

export type AuthStats = {
  today: AuthDayStats;
  yesterday: AuthDayStats;
  /** Tài khoản tạo mới hôm nay (bảng users). */
  newUsers: number;
  /** Trong số tài khoản mới hôm nay, bao nhiêu đăng nhập lần đầu bằng OAuth. */
  newUsersByMethod: Record<LoginMethod, number>;
  /** IP bị chặn tự động hôm nay (5 lần sai liên tiếp). */
  blockedIpsToday: number;
  /** Giờ (ICT) có nhiều lượt đăng nhập nhất hôm nay, null nếu chưa có lượt nào. */
  peakHour: number | null;
};

function emptyDay(): AuthDayStats {
  return { total: 0, uniqueUsers: 0, byMethod: { password: 0, google: 0, facebook: 0, other: 0 } };
}

function normalizeMethod(raw: string | null): LoginMethod {
  if (raw === "google" || raw === "facebook" || raw === "password") return raw;
  return "other";
}

type LoginRow = { user_id: string | null; method: string | null; created_at: string };

function summarize(rows: LoginRow[]): AuthDayStats {
  const day = emptyDay();
  const users = new Set<string>();
  for (const row of rows) {
    day.total += 1;
    day.byMethod[normalizeMethod(row.method)] += 1;
    if (row.user_id) users.add(row.user_id);
  }
  day.uniqueUsers = users.size;
  return day;
}

/** Giờ ICT của một timestamp ISO. */
function vnHourOf(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false,
    }).format(new Date(iso)),
  ) % 24;
}

/**
 * Số liệu đăng nhập / đăng ký theo ngày (múi giờ VN). Dùng chung cho báo cáo ngày
 * và báo cáo chuyên sâu — không tự gửi đi đâu cả.
 */
export async function getAuthStats(): Promise<AuthStats> {
  const empty: AuthStats = {
    today: emptyDay(),
    yesterday: emptyDay(),
    newUsers: 0,
    newUsersByMethod: { password: 0, google: 0, facebook: 0, other: 0 },
    blockedIpsToday: 0,
    peakHour: null,
  };

  const supabase = createAdminSupabaseClient();
  if (!supabase) return empty;

  const todayStart     = `${vnDateKey(0)}T00:00:00+07:00`;
  const yesterdayStart = `${vnDateKey(1)}T00:00:00+07:00`;

  const [loginsRes, newUsersRes, settingsRes] = await Promise.allSettled([
    (supabase.from("login_logs") as ReturnType<typeof supabase.from>)
      .select("user_id, method, created_at")
      .gte("created_at", yesterdayStart)
      .order("created_at", { ascending: true })
      .limit(5000),
    (supabase.from("users") as ReturnType<typeof supabase.from>)
      .select("id")
      .gte("created_at", todayStart)
      .limit(2000),
    getSettings(),
  ]);

  const allRows: LoginRow[] =
    loginsRes.status === "fulfilled"
      ? ((loginsRes.value as { data: LoginRow[] | null }).data ?? [])
      : [];

  const todayRows     = allRows.filter((r) => r.created_at >= todayStart);
  const yesterdayRows = allRows.filter((r) => r.created_at < todayStart);

  const stats: AuthStats = {
    today: summarize(todayRows),
    yesterday: summarize(yesterdayRows),
    newUsers: 0,
    newUsersByMethod: { password: 0, google: 0, facebook: 0, other: 0 },
    blockedIpsToday: 0,
    peakHour: null,
  };

  // Tài khoản mới hôm nay + nguồn đăng ký (suy ra từ lượt đăng nhập đầu tiên).
  if (newUsersRes.status === "fulfilled") {
    const newIds = ((newUsersRes.value as { data: Array<{ id: string }> | null }).data ?? []).map((u) => u.id);
    stats.newUsers = newIds.length;
    const newIdSet = new Set(newIds);
    const firstMethod = new Map<string, LoginMethod>();
    for (const row of todayRows) {
      if (!row.user_id || !newIdSet.has(row.user_id) || firstMethod.has(row.user_id)) continue;
      firstMethod.set(row.user_id, normalizeMethod(row.method));
    }
    for (const id of newIds) {
      // Đăng ký bằng form không ghi login_logs ngay → mặc định tính là password.
      stats.newUsersByMethod[firstMethod.get(id) ?? "password"] += 1;
    }
  }

  // IP bị chặn hôm nay (lưu trong settings, không có bảng riêng).
  if (settingsRes.status === "fulfilled") {
    const raw = settingsRes.value.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? "[]";
    try {
      const list = JSON.parse(raw) as Array<{ blockedAt: number }>;
      const dayStartMs = new Date(todayStart).getTime();
      stats.blockedIpsToday = list.filter((e) => typeof e.blockedAt === "number" && e.blockedAt >= dayStartMs).length;
    } catch { /* giữ 0 */ }
  }

  // Giờ cao điểm.
  if (todayRows.length > 0) {
    const buckets = new Array<number>(24).fill(0);
    for (const row of todayRows) buckets[vnHourOf(row.created_at)] += 1;
    let best = 0;
    for (let h = 1; h < 24; h += 1) if (buckets[h] > buckets[best]) best = h;
    stats.peakHour = buckets[best] > 0 ? best : null;
  }

  return stats;
}

/** Có hoạt động đăng nhập/đăng ký nào trong ngày không. */
export function hasAuthActivity(stats: AuthStats): boolean {
  return stats.today.total > 0 || stats.newUsers > 0 || stats.blockedIpsToday > 0;
}
