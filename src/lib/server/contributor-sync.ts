import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type ContributorAction = "post" | "reply" | "wiki";

/**
 * Upsert contributor_points for a user after they contribute content.
 * Safe to call fire-and-forget — all errors are swallowed.
 */
export async function syncContributorPoints(
  userId: string,
  displayName: string,
  avatarUrl: string | null | undefined,
  action: ContributorAction,
): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;

  try {
    // Fetch current row
    const { data: existing } = await untypedFrom(db, "contributor_points")
      .select("posts_count, replies_count, wiki_count, total_points, bonus_points")
      .eq("user_id", userId)
      .maybeSingle() as {
        data: {
          posts_count: number;
          replies_count: number;
          wiki_count: number;
          total_points: number;
          bonus_points: number | null;
        } | null;
      };

    const posts  = (existing?.posts_count  ?? 0) + (action === "post"  ? 1 : 0);
    const replies = (existing?.replies_count ?? 0) + (action === "reply" ? 1 : 0);
    const wiki   = (existing?.wiki_count   ?? 0) + (action === "wiki"  ? 1 : 0);

    // Simple scoring: post=10, reply=3, wiki=30
    // bonus_points = thưởng nhiệm vụ tuần (quests.ts). Phải cộng vào đây vì
    // total_points được tính lại từ đầu mỗi lần — bỏ sót là xoá sạch thưởng.
    const bonus  = existing?.bonus_points ?? 0;
    const total = posts * 10 + replies * 3 + wiki * 30 + bonus;

    // Determine badge tier
    const badge =
      total >= 500  ? "legend" :
      total >= 200  ? "expert" :
      total >= 100  ? "veteran" :
      total >= 50   ? "regular" :
                      "member";

    await untypedFrom(db, "contributor_points").upsert({
      user_id:       userId,
      display_name:  displayName,
      avatar_url:    avatarUrl ?? null,
      posts_count:   posts,
      replies_count: replies,
      wiki_count:    wiki,
      total_points:  total,
      badge,
      updated_at:    new Date().toISOString(),
    } as never, { onConflict: "user_id" });
  } catch {
    // non-critical
  }
}
