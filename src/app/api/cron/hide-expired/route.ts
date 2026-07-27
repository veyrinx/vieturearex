import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";

// Auto-hide (not delete — reversible) expired / stale content.
// Called by Vercel Cron daily. Content is hidden by status change so admins
// can restore it; nothing is permanently removed.
//
// Rules:
//  - Events: end_date in the past          -> status "expired"
//  - News:   published & older than N days  -> status "draft"    (N = settings cron.hide_news_days, default 365, 0 = off)
//  - Forum:  active & inactive for N days   -> status "removed"  (N = settings cron.hide_forum_days, default 365, 0 = off)

const DEFAULT_NEWS_DAYS = 365;
const DEFAULT_FORUM_DAYS = 365;

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function readDays(map: Record<string, string>, key: string, fallback: number): number {
  const raw = map[key];
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const enabled = map["cron.hide_expired_enabled"] !== "false";
  if (!enabled) return NextResponse.json({ ok: true, skipped: "disabled" });

  const newsDays = readDays(map, "cron.hide_news_days", DEFAULT_NEWS_DAYS);
  const forumDays = readDays(map, "cron.hide_forum_days", DEFAULT_FORUM_DAYS);
  const now = new Date().toISOString();

  const result = { events: 0, news: 0, forum: 0 };

  // ── Events: past end_date → expired ──
  try {
    const { data } = await untypedFrom(db, "events")
      .update({ status: "expired" })
      .lt("end_date", now)
      .neq("status", "expired")
      .select("id") as { data: Array<{ id: string }> | null };
    result.events = data?.length ?? 0;
  } catch { /* column/table missing — skip */ }

  // ── News: published & older than N days → draft ──
  if (newsDays > 0) {
    try {
      const { data } = await untypedFrom(db, "news")
        .update({ status: "draft" })
        .eq("status", "published")
        .lt("created_at", daysAgoIso(newsDays))
        .select("id") as { data: Array<{ id: string }> | null };
      result.news = data?.length ?? 0;
    } catch { /* skip */ }
  }

  // ── Forum: active & inactive for N days → removed ──
  if (forumDays > 0) {
    try {
      const { data } = await untypedFrom(db, "forum_posts")
        .update({ status: "removed" })
        .eq("status", "active")
        .lt("updated_at", daysAgoIso(forumDays))
        .select("id") as { data: Array<{ id: string }> | null };
      result.forum = data?.length ?? 0;
    } catch { /* skip */ }
  }

  if (result.events > 0) revalidatePath("/", "layout");
  if (result.events > 0) { revalidatePath("/events", "layout"); revalidatePath("/calendar", "layout"); }
  if (result.news > 0) revalidatePath("/news", "layout");
  if (result.forum > 0) revalidatePath("/community", "layout");

  return NextResponse.json({ ok: true, hidden: result, newsDays, forumDays });
}
