import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { SITE_URL } from "@/lib/constants/site";

type NewsRow   = { slug: string; title: string; category: string | null };
type EventRow  = { id: string; title: string; start_date: string };
type WikiRow   = { slug: string; title: string; category: string };
type ForumRow  = { id: string; title: string; category: string; display_name: string };

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const siteUrl = SITE_URL;

  const [newsRes, eventsRes, wikiRes, forumRes] = await Promise.all([
    untypedFrom(db, "news")
      .select("slug, title, category")
      .gte("created_at", since)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: NewsRow[] | null }>,

    untypedFrom(db, "events")
      .select("id, title, start_date")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: EventRow[] | null }>,

    untypedFrom(db, "wiki_articles")
      .select("slug, title, category")
      .gte("updated_at", since)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: WikiRow[] | null }>,

    untypedFrom(db, "forum_posts")
      .select("id, title, category, display_name")
      .gte("created_at", since)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: ForumRow[] | null }>,
  ]);

  const news   = newsRes.data   ?? [];
  const events = eventsRes.data ?? [];
  const wiki   = wikiRes.data   ?? [];
  const forum  = forumRes.data  ?? [];

  const total = news.length + events.length + wiki.length + forum.length;

  if (total === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_new_content" });
  }

  const sections = [];

  if (news.length > 0) {
    sections.push({
      icon: "📰",
      heading: `Tin tức mới (${news.length})`,
      rows: news.map((n) => ({
        label: n.category ?? "Tin tức",
        value: n.title,
        bold: true,
      })),
    });
  }

  if (events.length > 0) {
    sections.push({
      icon: "🎮",
      heading: `Sự kiện mới (${events.length})`,
      rows: events.map((e) => ({
        label: new Date(e.start_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        value: e.title,
        bold: true,
      })),
    });
  }

  if (wiki.length > 0) {
    sections.push({
      icon: "📖",
      heading: `Wiki mới (${wiki.length})`,
      rows: wiki.map((w) => ({
        label: w.category,
        value: w.title,
      })),
    });
  }

  if (forum.length > 0) {
    sections.push({
      icon: "💬",
      heading: `Diễn đàn mới (${forum.length})`,
      rows: forum.map((f) => ({
        label: f.display_name,
        value: f.title,
      })),
    });
  }

  const payload = {
    title: "⏰ BẢN TIN HÀNG GIỜ",
    subtitle: `Cập nhật lúc ${vnNow()} (ICT)`,
    sections,
    actions: [{ label: "👉 Xem tất cả", url: siteUrl }],
    footer: `✨ ${new URL(siteUrl).hostname}`,
  };

  const [tgResult, dcResult] = await Promise.allSettled([
    sendUserTelegramNotification(payload),
    sendDiscordPublicNotification(payload, DISCORD_COLORS.info),
  ]);

  return NextResponse.json({
    ok: true,
    sent: true,
    total,
    news: news.length,
    events: events.length,
    wiki: wiki.length,
    forum: forum.length,
    telegram: tgResult.status === "fulfilled" ? tgResult.value : { sent: false },
    discord:  dcResult.status  === "fulfilled" ? dcResult.value  : { sent: false },
  });
}
