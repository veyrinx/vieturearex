import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Nhiệm vụ tuần.
 *
 * Tiến độ KHÔNG được lưu vào đâu cả — mỗi lần hỏi là đếm lại từ bảng nguồn
 * (forum_posts, news_comments, shop_orders…). Đắt hơn một chút nhưng đổi lại
 * không bao giờ lệch: xoá một bài viết thì tiến độ tụt xuống đúng như thật,
 * không cần bộ đếm riêng và không cần trigger giữ đồng bộ.
 *
 * Bảng `quest_claims` chỉ ghi "tuần này đã nhận thưởng chưa".
 *
 * Tuần tính theo giờ VN, bắt đầu thứ Hai.
 */

export interface QuestDef {
  key: string;
  title: string;
  hint: string;
  target: number;
  points: number;
  /** Đường dẫn để nút "Làm ngay" đưa người dùng tới đúng chỗ. */
  href: string;
}

export const WEEKLY_QUESTS: QuestDef[] = [
  {
    key: "forum_post",
    title: "Đăng 2 bài diễn đàn",
    hint: "Bài phải còn hiển thị (không bị ẩn) mới tính.",
    target: 2,
    points: 30,
    href: "/community",
  },
  {
    key: "forum_reply",
    title: "Trả lời 5 bình luận",
    hint: "Trả lời trong diễn đàn Arex.",
    target: 5,
    points: 20,
    href: "/community",
  },
  {
    key: "news_comment",
    title: "Bình luận 3 bài tin",
    hint: "Chỉ tính bình luận đã được duyệt.",
    target: 3,
    points: 15,
    href: "/news",
  },
  {
    key: "wiki_edit",
    title: "Đóng góp 1 mục wiki",
    hint: "Thêm mới hoặc sửa một trang wiki.",
    target: 1,
    points: 25,
    href: "/wiki",
  },
  {
    key: "checkin_streak",
    title: "Giữ chuỗi điểm danh 7 ngày",
    hint: "Chuỗi hiện tại, không phải số ngày trong tuần này.",
    target: 7,
    points: 20,
    href: "/profile",
  },
  {
    key: "shop_order",
    title: "Hoàn tất 1 đơn chợ Arex",
    hint: "Tính đơn bạn mua và đã nhận hàng xong.",
    target: 1,
    points: 40,
    href: "/shop",
  },
];

/** Thứ Hai của tuần hiện tại theo giờ VN, dạng YYYY-MM-DD. */
export function currentWeekStart(now: Date = new Date()): string {
  // Đổi sang "giờ tường" VN trước rồi mới cắt ngày, nếu không thì từ 00:00 đến
  // 07:00 giờ VN sẽ bị tính sang tuần trước (máy chủ chạy UTC).
  const vn = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const dow = vn.getDay(); // 0 = CN
  const backToMonday = dow === 0 ? 6 : dow - 1;
  vn.setDate(vn.getDate() - backToMonday);
  vn.setHours(0, 0, 0, 0);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, "0");
  const d = String(vn.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Mốc thời gian tuyệt đối của đầu tuần VN, để so với cột timestamptz. */
function weekStartIso(weekStart: string): string {
  // 00:00 giờ VN = 17:00 UTC hôm trước (VN = UTC+7, không có DST).
  return new Date(`${weekStart}T00:00:00+07:00`).toISOString();
}

export interface QuestProgress extends QuestDef {
  progress: number;
  done: boolean;
  claimed: boolean;
}

export interface QuestBoard {
  weekStart: string;
  quests: QuestProgress[];
  earnedThisWeek: number;
  claimableNow: number;
}

async function countSince(
  table: string,
  userColumn: string,
  userId: string,
  sinceIso: string,
  timeColumn: string,
  extra?: { column: string; value: string },
): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) return 0;
  let q = untypedFrom(db, table)
    .select("id", { count: "exact", head: true })
    .eq(userColumn, userId)
    .gte(timeColumn, sinceIso);
  if (extra) q = q.eq(extra.column, extra.value);
  const { count, error } = (await q) as { count: number | null; error: unknown };
  // Bảng chưa có / cột lệch → coi như 0 thay vì làm hỏng cả bảng nhiệm vụ.
  return error ? 0 : count ?? 0;
}

/** Đếm tiến độ tất cả nhiệm vụ của một người trong tuần hiện tại. */
export async function getQuestBoard(userId: string): Promise<QuestBoard> {
  const weekStart = currentWeekStart();
  const since = weekStartIso(weekStart);
  const db = createAdminSupabaseClient();

  const [posts, replies, comments, wiki, orders, streak, claims] = await Promise.all([
    countSince("forum_posts", "user_id", userId, since, "created_at", { column: "status", value: "active" }),
    countSince("forum_replies", "user_id", userId, since, "created_at", { column: "status", value: "active" }),
    countSince("news_comments", "user_id", userId, since, "created_at", { column: "status", value: "approved" }),
    countSince("wiki_edits", "editor_id", userId, since, "created_at"),
    countSince("shop_orders", "buyer_id", userId, since, "completed_at", { column: "status", value: "completed" }),
    (async () => {
      if (!db) return 0;
      const { data } = (await untypedFrom(db, "users")
        .select("login_streak")
        .eq("id", userId)
        .maybeSingle()) as { data: { login_streak: number | null } | null };
      return data?.login_streak ?? 0;
    })(),
    (async () => {
      if (!db) return [] as { quest_key: string }[];
      const { data } = (await untypedFrom(db, "quest_claims")
        .select("quest_key")
        .eq("user_id", userId)
        .eq("week_start", weekStart)) as { data: { quest_key: string }[] | null };
      return data ?? [];
    })(),
  ]);

  const progressByKey: Record<string, number> = {
    forum_post: posts,
    forum_reply: replies,
    news_comment: comments,
    wiki_edit: wiki,
    shop_order: orders,
    checkin_streak: streak,
  };

  const claimed = new Set(claims.map((c) => c.quest_key));

  const quests: QuestProgress[] = WEEKLY_QUESTS.map((q) => {
    const progress = progressByKey[q.key] ?? 0;
    return {
      ...q,
      progress: Math.min(progress, q.target),
      done: progress >= q.target,
      claimed: claimed.has(q.key),
    };
  });

  return {
    weekStart,
    quests,
    earnedThisWeek: quests.filter((q) => q.claimed).reduce((s, q) => s + q.points, 0),
    claimableNow: quests.filter((q) => q.done && !q.claimed).reduce((s, q) => s + q.points, 0),
  };
}

export type ClaimResult =
  | { ok: true; points: number; totalPoints: number }
  | { ok: false; error: string; code: number };

/**
 * Nhận thưởng một nhiệm vụ. Chống nhận hai lần bằng UNIQUE
 * (user_id, quest_key, week_start) chứ không bằng kiểm tra trước khi ghi —
 * hai request bấm cùng lúc thì ràng buộc ở DB mới là chốt chặn thật.
 */
export async function claimQuest(userId: string, questKey: string): Promise<ClaimResult> {
  const quest = WEEKLY_QUESTS.find((q) => q.key === questKey);
  if (!quest) return { ok: false, error: "Nhiệm vụ không tồn tại.", code: 404 };

  const db = createAdminSupabaseClient();
  if (!db) return { ok: false, error: "Không kết nối được cơ sở dữ liệu.", code: 500 };

  const board = await getQuestBoard(userId);
  const current = board.quests.find((q) => q.key === questKey);
  if (!current?.done) return { ok: false, error: "Chưa hoàn thành nhiệm vụ này.", code: 400 };
  if (current.claimed) return { ok: false, error: "Tuần này đã nhận rồi.", code: 409 };

  const { error: claimError } = (await untypedFrom(db, "quest_claims").insert({
    user_id: userId,
    quest_key: questKey,
    week_start: board.weekStart,
    points: quest.points,
  } as never)) as { error: { code?: string; message?: string } | null };

  if (claimError) {
    // 23505 = trùng khoá: request kia đã nhận trước.
    if (claimError.code === "23505") return { ok: false, error: "Tuần này đã nhận rồi.", code: 409 };
    return { ok: false, error: claimError.message ?? "Không ghi được.", code: 500 };
  }

  const totalPoints = await addBonusPoints(userId, quest.points);
  return { ok: true, points: quest.points, totalPoints };
}

/**
 * Cộng điểm thưởng và tính lại total_points + badge cho khớp cách
 * contributor-sync.ts tính, để hai đường ghi không đá nhau.
 */
async function addBonusPoints(userId: string, points: number): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) return 0;

  const { data: row } = (await untypedFrom(db, "contributor_points")
    .select("posts_count, replies_count, wiki_count, bonus_points")
    .eq("user_id", userId)
    .maybeSingle()) as {
    data: {
      posts_count: number | null;
      replies_count: number | null;
      wiki_count: number | null;
      bonus_points: number | null;
    } | null;
  };

  const bonus = (row?.bonus_points ?? 0) + points;
  const total =
    (row?.posts_count ?? 0) * 10 + (row?.replies_count ?? 0) * 3 + (row?.wiki_count ?? 0) * 30 + bonus;

  const badge =
    total >= 500 ? "legend" :
    total >= 200 ? "expert" :
    total >= 100 ? "veteran" :
    total >= 50 ? "regular" :
    "member";

  await untypedFrom(db, "contributor_points").upsert(
    {
      user_id: userId,
      bonus_points: bonus,
      total_points: total,
      badge,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" },
  );

  return total;
}
