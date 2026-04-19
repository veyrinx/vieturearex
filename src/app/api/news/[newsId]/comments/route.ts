import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";

const postSchema = z.object({
  content: z.string().min(1).max(500),
});

type RouteContext = { params: { newsId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ comments: [] });

  const { data, error } = await supabase
    .from("news_comments")
    .select("id, display_name, content, status, created_at")
    .eq("news_id", params.newsId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(100) as { data: Array<{ id: string; display_name: string; content: string; status: string; created_at: string }> | null; error: unknown };

  if (error) return NextResponse.json({ comments: [] });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "news-comment", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  // Fetch display name
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
  } as never);

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Hệ thống bình luận đang được thiết lập." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
