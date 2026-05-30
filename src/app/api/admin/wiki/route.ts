import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  author_name: string;
  view_count: number;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ articles: [] });

  const { data } = await (untypedFrom(db, "wiki_articles")
    .select("id, slug, title, category, status, author_name, view_count, edit_count, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200) as unknown as Promise<{ data: WikiArticle[] | null }>);

  return NextResponse.json({ articles: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-del", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { slug } = await request.json().catch(() => ({})) as { slug?: string };
  if (!slug) return NextResponse.json({ error: "Thiếu slug" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "wiki_articles").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: "Không thể xóa bài wiki" }, { status: 500 });

  void logAdminActivity({
    action: "wiki_delete",
    targetType: "wiki",
    targetId: slug,
    summary: `Xóa bài wiki "${slug}"`,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wiki-patch", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { slug, status } = await request.json().catch(() => ({})) as { slug?: string; status?: string };
  if (!slug || !status) return NextResponse.json({ error: "Thiếu slug hoặc status" }, { status: 400 });
  if (!["published", "draft"].includes(status)) return NextResponse.json({ error: "Status không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "wiki_articles").update({ status } as never).eq("slug", slug);
  if (error) return NextResponse.json({ error: "Không thể cập nhật trạng thái" }, { status: 500 });

  void logAdminActivity({
    action: "wiki_status",
    targetType: "wiki",
    targetId: slug,
    summary: `Đổi trạng thái bài wiki "${slug}" → ${status}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
