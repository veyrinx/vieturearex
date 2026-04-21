import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  parent_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: { newsId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ comments: [] });

  const { data, error } = await supabase
    .from("news_comments")
    .select("id, user_id, display_name, content, status, created_at, parent_id")
    .eq("news_id", params.newsId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200) as { data: Array<{ id: string; user_id: string | null; display_name: string; content: string; status: string; created_at: string; parent_id: string | null }> | null; error: { code?: string } | null };

  // Table missing or any DB error → return empty silently
  if (error) return NextResponse.json({ comments: [] });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "news-comment", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Hệ thống bình luận tạm thời không khả dụng." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null } | null };

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Người dùng";

  const { error } = await (supabase.from("news_comments") as ReturnType<typeof supabase.from>).insert({
    news_id: params.newsId,
    user_id: user.id,
    display_name: displayName,
    content: parsed.data.content,
    status: "pending",
    parent_id: parsed.data.parent_id ?? null,
  } as never);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST204") {
      return NextResponse.json({ error: "Hệ thống bình luận đang được thiết lập. Vui lòng thử lại sau." }, { status: 503 });
    }
    // Never expose raw DB error messages to client
    return NextResponse.json({ error: "Không thể gửi bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  // Log user activity
  await logAdminActivity({
    action: "USER_COMMENTED",
    targetType: "NEWS",
    targetId: params.newsId,
    summary: `${displayName} (${user.email}) bình luận bài viết ${params.newsId}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
