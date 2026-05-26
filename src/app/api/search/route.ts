import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "search", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all"; // "all" | "news" | "event"
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const category = searchParams.get("category") ?? "";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return NextResponse.json({ results: [] });

  const results: Array<{
    type: "news" | "event";
    id: string;
    title: string;
    description: string;
    date: string;
    href: string;
    status?: string;
    category?: string;
    slug?: string;
  }> = [];

  const [newsRes, eventsRes] = await Promise.allSettled([
    type !== "event"
      ? sb.from("news")
          .select("id, title, slug, excerpt, category, status, created_at")
          .eq("status", "published")
          .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
          .limit(limit)
      : Promise.resolve({ data: null }),

    type !== "news"
      ? sb.from("events")
          .select("id, title, description, start_date, status, server_region")
          .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(limit)
      : Promise.resolve({ data: null }),
  ]);

  type NewsRow = { id: string; title: string; slug: string; excerpt: string; category: string; status: string; created_at: string };
  type EventRow = { id: string; title: string; description: string; start_date: string; status: string; server_region: string | null };

  if (newsRes.status === "fulfilled" && newsRes.value.data) {
    for (const n of newsRes.value.data as NewsRow[]) {
      if (category && n.category !== category) continue;
      results.push({
        type: "news",
        id: n.id,
        title: n.title,
        description: n.excerpt?.slice(0, 150) ?? "",
        date: n.created_at,
        href: `/news/${n.slug}`,
        status: n.status,
        category: n.category,
        slug: n.slug,
      });
    }
  }

  if (eventsRes.status === "fulfilled" && eventsRes.value.data) {
    for (const e of eventsRes.value.data as EventRow[]) {
      results.push({
        type: "event",
        id: e.id,
        title: e.title,
        description: e.description?.slice(0, 150) ?? "",
        date: e.start_date,
        href: `/events/${e.id}`,
        status: e.status,
        category: e.server_region ?? undefined,
      });
    }
  }

  // Sort by date desc
  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ results: results.slice(0, limit) });
}
