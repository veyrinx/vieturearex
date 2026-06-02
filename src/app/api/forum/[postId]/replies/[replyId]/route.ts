import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

type Ctx = { params: Promise<{ postId: string; replyId: string }> };

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

  await untypedFrom(db, "forum_replies")
    .update({ status: "removed" } as never)
    .eq("id", replyId);

  return NextResponse.json({ ok: true });
}
