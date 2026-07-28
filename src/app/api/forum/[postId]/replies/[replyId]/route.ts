import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { REPLY_MAX_HTML, validateReplyContent } from "@/lib/utils/forum-content";

type Ctx = { params: Promise<{ postId: string; replyId: string }> };

const editSchema = z.object({ content: z.string().min(1).max(REPLY_MAX_HTML) });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { replyId, postId } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nội dung quá dài hoặc không hợp lệ." }, { status: 400 });
  }

  const invalid = validateReplyContent(parsed.data.content);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: reply } = await untypedFrom(db, "forum_replies")
    .select("user_id")
    .eq("id", replyId)
    .eq("post_id", postId)
    .single() as { data: { user_id: string } | null };

  if (!reply) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  if (reply.user_id !== user.id) return NextResponse.json({ error: "Không có quyền." }, { status: 403 });

  const { error } = await untypedFrom(db, "forum_replies")
    .update({ content: parsed.data.content } as never)
    .eq("id", replyId) as { error: { message?: string } | null };

  if (error) {
    console.error("[forum] edit reply failed:", error);
    return NextResponse.json({ error: "Không thể lưu chỉnh sửa." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { replyId, postId } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: reply } = await untypedFrom(db, "forum_replies")
    .select("user_id")
    .eq("id", replyId)
    .eq("post_id", postId)
    .single() as { data: { user_id: string } | null };

  if (!reply) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  if (reply.user_id !== user.id) return NextResponse.json({ error: "Không có quyền." }, { status: 403 });

  // Soft delete. "hidden" is the only non-active value the CHECK constraint on
  // forum_replies.status accepts — "removed" silently failed the update.
  const { error } = await untypedFrom(db, "forum_replies")
    .update({ status: "hidden" } as never)
    .eq("id", replyId) as { error: { message?: string } | null };

  if (error) {
    console.error("[forum] delete reply failed:", error);
    return NextResponse.json({ error: "Không thể xóa trả lời." }, { status: 500 });
  }

  // The insert trigger bumps forum_posts.reply_count; nothing walked it back.
  // Non-critical: a stale counter must not fail the delete.
  try {
    await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> })
      .rpc("decrement_forum_reply_count", { p_post_id: postId });
  } catch { /* counter drift is cosmetic */ }

  return NextResponse.json({ ok: true });
}
