import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/content-service";

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const supabase = createAdminSupabaseClient() ?? createServerSupabaseClient();

  // Daily views (last 30 days)
  const settings = await getSettings();
  const dailyRaw = settings.find((s) => s.key === "analytics.daily_views")?.value ?? "{}";
  const archived = Number(settings.find((s) => s.key === "analytics.views")?.value ?? 0) || 0;
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const dailyTotal = Object.values(daily).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalViews = archived + dailyTotal;

  const chart: { date: string; views: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    chart.push({ date: k, views: daily[k] ?? 0 });
  }

  // Aggregate all stored daily data by year and month
  const yearMap: Record<string, number> = {};
  const monthMap: Record<string, number> = {};
  for (const [date, count] of Object.entries(daily)) {
    const year = date.slice(0, 4);
    const month = date.slice(0, 7);
    yearMap[year] = (yearMap[year] ?? 0) + count;
    monthMap[month] = (monthMap[month] ?? 0) + count;
  }
  const byYear = Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, views: v }));
  const byMonth = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ key: k, views: v }));

  // Top news by comment count
  type CommentRow = { news_id: string; count: number };
  const topNews: { id: string; title: string; slug: string; comments: number }[] = [];
  if (supabase) {
    const { data: commentCounts } = await (supabase as unknown as {
      from: (t: string) => { select: (s: string) => { limit: (n: number) => Promise<{ data: CommentRow[] | null }> } }
    }).from("news_comments").select("news_id, count:id.count()").limit(5) as { data: CommentRow[] | null };

    if (commentCounts?.length) {
      const ids = commentCounts.map((r) => r.news_id);
      const { data: newsRows } = await supabase.from("news").select("id, title, slug").in("id", ids) as
        { data: { id: string; title: string; slug: string }[] | null };
      for (const row of commentCounts) {
        const n = newsRows?.find((x) => x.id === row.news_id);
        if (n) topNews.push({ ...n, comments: Number(row.count) });
      }
      topNews.sort((a, b) => b.comments - a.comments);
    }
  }

  // Points leaderboard (top 10) — gracefully handle missing migration columns
  type LeaderRow = { id: string; display_name: string | null; points: number; rank: string };
  let leaderboard: LeaderRow[] = [];
  if (supabase) {
    const { data, error } = await supabase.from("users")
      .select("id, display_name, points, rank")
      .order("points", { ascending: false })
      .limit(10)
      .neq("role", "user") as { data: LeaderRow[] | null; error: { message?: string } | null };
    if (!error && data) leaderboard = data;
  }

  return NextResponse.json({ chart, byYear, byMonth, totalViews, topNews, leaderboard });
}
