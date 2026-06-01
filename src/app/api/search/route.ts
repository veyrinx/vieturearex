import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

type ResultType = "news" | "event" | "forum" | "wiki";

type SearchResult = {
  type: ResultType;
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  status?: string;
  category?: string;
  slug?: string;
};

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "search", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all"; // "all" | "news" | "event" | "forum" | "wiki"
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const category = searchParams.get("category") ?? "";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return NextResponse.json({ results: [] });

  const perSource = Math.ceil(limit / (type === "all" ? 4 : 1));

  const [newsRes, eventsRes, forumRes, wikiRes] = await Promise.allSettled([
    (type === "all" || type === "news")
      ? sb.from("news")
          .select("id, title, slug, excerpt, category, status, created_at")
          .eq("status", "published")
          .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
          .limit(perSource)
      : Promise.resolve({ data: null }),

    (type === "all" || type === "event")
      ? sb.from("events")
          .select("id, title, description, start_date, status, server_region")
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(perSource)
      : Promise.resolve({ data: null }),

    (type === "all" || type === "forum")
      ? (untypedFrom(sb, "forum_posts")
          .select("id, title, category, display_name, view_count, reply_count, created_at")
          .eq("status", "active")
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .limit(perSource) as unknown as Promise<{ data: Array<{ id: string; title: string; category: string; display_name: string; view_count: number; reply_count: number; created_at: string }> | null }>)
      : Promise.resolve({ data: null }),

    (type === "all" || type === "wiki")
      ? (untypedFrom(sb, "wiki_articles")
          .select("slug, title, excerpt, category, author_name, updated_at")
          .eq("status", "published")
          .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`)
          .limit(perSource) as unknown as Promise<{ data: Array<{ slug: string; title: string; excerpt: string | null; category: string; author_name: string; updated_at: string }> | null }>)
      : Promise.resolve({ data: null }),
  ]);

  const results: SearchResult[] = [];

  if (newsRes.status === "fulfilled" && newsRes.value.data) {
    for (const n of newsRes.value.data as { id: string; title: string; slug: string; excerpt: string; category: string; status: string; created_at: string }[]) {
      if (category && n.category !== category) continue;
      results.push({ type: "news", id: n.id, title: n.title, description: n.excerpt?.slice(0, 150) ?? "", date: n.created_at, href: `/news/${n.slug}`, status: n.status, category: n.category, slug: n.slug });
    }
  }

  if (eventsRes.status === "fulfilled" && eventsRes.value.data) {
    for (const e of eventsRes.value.data as { id: string; title: string; description: string; start_date: string; status: string; server_region: string | null }[]) {
      results.push({ type: "event", id: e.id, title: e.title, description: e.description?.slice(0, 150) ?? "", date: e.start_date, href: `/events/${e.id}`, status: e.status, category: e.server_region ?? undefined });
    }
  }

  if (forumRes.status === "fulfilled" && forumRes.value.data) {
    for (const f of forumRes.value.data) {
      if (category && f.category !== category) continue;
      results.push({
        type: "forum",
        id: f.id,
        title: f.title,
        description: `${f.display_name} · ${f.reply_count} trả lời · ${f.view_count} lượt xem`,
        date: f.created_at,
        href: `/cong-dong/${f.id}`,
        category: f.category,
      });
    }
  }

  if (wikiRes.status === "fulfilled" && wikiRes.value.data) {
    for (const w of wikiRes.value.data) {
      if (category && w.category !== category) continue;
      results.push({
        type: "wiki",
        id: w.slug,
        title: w.title,
        description: w.excerpt?.slice(0, 150) ?? `Tác giả: ${w.author_name}`,
        date: w.updated_at,
        href: `/wiki/${w.slug}`,
        category: w.category,
        slug: w.slug,
      });
    }
  }

  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json({ results: results.slice(0, limit) });
}
