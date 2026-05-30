import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

const updateSchema = z.object({
  title:     z.string().min(3).max(200).optional(),
  content:   z.string().min(20).optional(),
  excerpt:   z.string().max(300).optional().nullable(),
  category:  z.string().optional(),
  cover_url: z.string().url().optional().nullable().or(z.literal("")),
  summary:   z.string().max(300).optional(),
});

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  cover_url: string | null;
  author_id: string | null;
  author_name: string;
  status: string;
  view_count: number;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: article, error } = await untypedFrom(db, "wiki_articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle() as { data: WikiArticle | null; error: unknown };

  if (error || !article) {
    return NextResponse.json({ error: "Bài viết không tồn tại." }, { status: 404 });
  }

  void untypedFrom(db, "wiki_articles")
    .update({ view_count: article.view_count + 1 } as never)
    .eq("id", article.id);

  return NextResponse.json({ article });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Check article ownership
  const { data: article } = await untypedFrom(db, "wiki_articles")
    .select("id, author_id, edit_count, author_name")
    .eq("slug", slug)
    .maybeSingle() as { data: { id: string; author_id: string | null; edit_count: number; author_name: string } | null };

  if (!article) return NextResponse.json({ error: "Bài viết không tồn tại." }, { status: 404 });

  // Check user role
  const { data: profile } = await untypedFrom(db, "users")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle() as { data: { role: string | null; display_name: string | null } | null };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isAuthor = article.author_id === user.id;

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa bài này." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { summary, ...updateFields } = parsed.data;
  const editorName = profile?.display_name ?? user.email?.split("@")[0] ?? "Ẩn danh";

  // Update article
  const { error: updateError } = await untypedFrom(db, "wiki_articles")
    .update({
      ...updateFields,
      cover_url:  updateFields.cover_url === "" ? null : updateFields.cover_url,
      edit_count: article.edit_count + 1,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", article.id);

  if (updateError) return NextResponse.json({ error: "Không thể cập nhật bài." }, { status: 500 });

  // Insert edit history
  await untypedFrom(db, "wiki_edits").insert({
    article_id:  article.id,
    editor_id:   user.id,
    editor_name: editorName,
    summary:     summary ?? null,
  } as never);

  return NextResponse.json({ ok: true });
}
