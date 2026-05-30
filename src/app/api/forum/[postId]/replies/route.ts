import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

type Ctx = { params: Promise<{ postId: string }> };

const schema = z.object({
  content:   z.string().min(2).max(3000),
  parent_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-replies", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ replies: [] });

  const { data } = await untypedFrom(db, "forum_replies")
    .select("id, display_name, avatar_url, content, parent_id, created_at")
    .eq("post_id", postId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(500) as { data: unknown[] | null };

  return NextResponse.json({ replies: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-reply-post", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users").select("display_name, avatar_url").eq("id", user.id).maybeSingle() as
    { data: { display_name: string | null; avatar_url: string | null } | null };

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: reply, error } = await untypedFrom(db, "forum_replies").insert({
    post_id:      postId,
    user_id:      user.id,
    display_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh",
    avatar_url:   profile?.avatar_url ?? null,
    content:      parsed.data.content,
    parent_id:    parsed.data.parent_id ?? null,
  } as never).select("id, display_name, avatar_url, content, parent_id, created_at").single() as
    { data: unknown; error: unknown };

  if (error || !reply) return NextResponse.json({ error: "Không thể gửi trả lời." }, { status: 500 });
  return NextResponse.json(reply, { status: 201 });
}
