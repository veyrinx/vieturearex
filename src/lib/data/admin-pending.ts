import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export type PendingItem = { key: string; label: string; count: number; href: string };

type CountResult = { count: number | null; error: unknown };
type AdminDb = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

// Đếm an toàn — lỗi (thiếu bảng/cột) trả 0 thay vì throw
async function safeCount(build: (db: AdminDb) => PromiseLike<CountResult>): Promise<number> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return 0;
    const { count, error } = await build(db);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Các mục đang chờ admin xử lý (bình luận, diễn đàn, đơn gia nhập...). */
export async function getPendingCounts(): Promise<PendingItem[]> {
  const [comments, eventComments, forum, teamJoin] = await Promise.all([
    safeCount((db) => untypedFrom(db, "news_comments").select("id", { count: "exact", head: true }).eq("status", "pending") as unknown as PromiseLike<CountResult>),
    safeCount((db) => untypedFrom(db, "event_comments").select("id", { count: "exact", head: true }).eq("status", "pending") as unknown as PromiseLike<CountResult>),
    safeCount((db) => untypedFrom(db, "forum_posts").select("id", { count: "exact", head: true }).eq("status", "pending") as unknown as PromiseLike<CountResult>),
    safeCount((db) => untypedFrom(db, "users").select("id", { count: "exact", head: true }).in("team_status", ["pending", "pending_it", "pending_admin"]) as unknown as PromiseLike<CountResult>),
  ]);

  return [
    { key: "comments",       label: "Bình luận tin tức chờ duyệt", count: comments,      href: "/admin/comments" },
    { key: "event-comments", label: "Bình luận sự kiện chờ duyệt",  count: eventComments, href: "/admin/comments" },
    { key: "forum",          label: "Bài diễn đàn chờ duyệt",       count: forum,         href: "/admin/forum" },
    { key: "team",           label: "Đơn gia nhập đội chờ xét",     count: teamJoin,      href: "/admin/team" },
  ];
}
