import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { checkContent } from "@/lib/server/content-filter";
import type { CommentWithAuthor } from "@/lib/types/content";

const postSchema = z.object({
  content: z.string().min(2).max(1000),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "ff-item-comment", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { id: itemId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Hệ thống bình luận tạm thời không khả dụng." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  if (checkContent(parsed.data.content) === "rejected") {
    return NextResponse.json({ error: "Bình luận chứa nội dung vi phạm. Vui lòng chỉnh sửa lại." }, { status: 422 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null; avatar_url: string | null } | null };

  const { data: inserted, error } = await (supabase.from("item_comments") as ReturnType<typeof supabase.from>)
    .insert({ item_id: itemId, user_id: user.id, content: parsed.data.content } as never)
    .select("id, content, created_at, user_id")
    .single() as { data: { id: string; content: string; created_at: string; user_id: string } | null; error: { code?: string } | null };

  if (error || !inserted) {
    const code = (error as { code?: string })?.code;
    if (code === "42P01" || code === "PGRST204") {
      return NextResponse.json({ error: "Hệ thống bình luận đang được thiết lập. Vui lòng thử lại sau." }, { status: 503 });
    }
    return NextResponse.json({ error: "Không thể gửi bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  const comment: CommentWithAuthor = {
    id: inserted.id,
    content: inserted.content,
    created_at: inserted.created_at,
    user_id: inserted.user_id,
    author: {
      id: user.id,
      display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Người dùng",
      avatar_url: profile?.avatar_url ?? null,
    },
  };

  return NextResponse.json({ ok: true, comment });
}
