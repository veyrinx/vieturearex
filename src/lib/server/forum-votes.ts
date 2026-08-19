import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Phiếu "hữu ích" của diễn đàn.
 *
 * Bản cũ chỉ cộng thẳng `helpful_count` rồi đánh dấu vào localStorage, nên một
 * người bấm bao nhiêu lần cũng được — chỉ cần xoá localStorage hoặc đổi trình
 * duyệt. Ở đây mỗi phiếu là một dòng thật (khoá chính đôi target + user chặn
 * trùng ở tầng DB), còn `helpful_count` chỉ là bản đếm lại để trang danh sách
 * không phải join.
 *
 * Bấm lần nữa là bỏ phiếu, giống mọi nút thích khác trên site.
 */

type Kind = "post" | "reply";

type Spec = { table: string; targetCol: string; parent: string; parentId: string };

const SPEC: Record<Kind, Spec> = {
  post:  { table: "forum_post_votes",  targetCol: "post_id",  parent: "forum_posts",   parentId: "id" },
  reply: { table: "forum_reply_votes", targetCol: "reply_id", parent: "forum_replies", parentId: "id" },
};

export type VoteState = { count: number; voted: boolean };

/** Bảng phiếu câu trả lời tới sau, nên thiếu bảng không phải lỗi — chỉ là chưa chạy migration. */
function isMissingTable(err: { code?: string } | null): boolean {
  return err?.code === "42P01" || err?.code === "PGRST205";
}

export class VoteUnavailableError extends Error {}

async function countVotes(kind: Kind, targetId: string): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) throw new VoteUnavailableError();
  const spec = SPEC[kind];

  const { count, error } = (await untypedFrom(db, spec.table)
    .select(spec.targetCol, { count: "exact", head: true })
    .eq(spec.targetCol, targetId)) as { count: number | null; error: { code?: string } | null };

  if (error) throw new VoteUnavailableError(error.code);
  return count ?? 0;
}

/** Đếm lại rồi ghi vào cột đệm trên bài/câu trả lời. */
async function syncCount(kind: Kind, targetId: string): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) throw new VoteUnavailableError();
  const spec = SPEC[kind];
  const n = await countVotes(kind, targetId);

  await untypedFrom(db, spec.parent)
    .update({ helpful_count: n } as never)
    .eq(spec.parentId, targetId);

  return n;
}

export async function getVoteState(
  kind: Kind,
  targetId: string,
  userId: string | null,
): Promise<VoteState> {
  const db = createAdminSupabaseClient();
  if (!db) throw new VoteUnavailableError();
  const spec = SPEC[kind];

  const count = await countVotes(kind, targetId);
  if (!userId) return { count, voted: false };

  const { data } = (await untypedFrom(db, spec.table)
    .select(spec.targetCol)
    .eq(spec.targetCol, targetId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: unknown };

  return { count, voted: Boolean(data) };
}

/** Chưa vote thì thêm, vote rồi thì bỏ. Trả về trạng thái sau khi đổi. */
export async function toggleVote(
  kind: Kind,
  targetId: string,
  userId: string,
): Promise<VoteState> {
  const db = createAdminSupabaseClient();
  if (!db) throw new VoteUnavailableError();
  const spec = SPEC[kind];

  const { data: existing, error: readErr } = (await untypedFrom(db, spec.table)
    .select(spec.targetCol)
    .eq(spec.targetCol, targetId)
    .eq("user_id", userId)
    .maybeSingle()) as { data: unknown; error: { code?: string } | null };

  if (readErr && isMissingTable(readErr)) throw new VoteUnavailableError(readErr.code);

  if (existing) {
    await untypedFrom(db, spec.table)
      .delete()
      .eq(spec.targetCol, targetId)
      .eq("user_id", userId);
    return { count: await syncCount(kind, targetId), voted: false };
  }

  const { error } = (await untypedFrom(db, spec.table).insert({
    [spec.targetCol]: targetId,
    user_id: userId,
  } as never)) as { error: { code?: string } | null };

  // 23505 = đã có phiếu (hai tab bấm cùng lúc) — coi như đã vote, không phải lỗi.
  if (error && error.code !== "23505") throw new VoteUnavailableError(error.code);

  return { count: await syncCount(kind, targetId), voted: true };
}

/** Bảng phiếu câu trả lời đã sẵn sàng chưa — dùng để ẩn nút khi chưa chạy migration. */
export async function replyVotesReady(): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;
  const { error } = (await untypedFrom(db, "forum_reply_votes")
    .select("reply_id", { count: "exact", head: true })
    .limit(1)) as { error: { code?: string } | null };
  return !error;
}
