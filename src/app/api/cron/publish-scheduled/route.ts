import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { sendPushNotification } from "@/lib/server/push-notify";
import { notifyUserNewArticle } from "@/lib/server/user-notify";
import { broadcastToSubscribers } from "@/lib/server/telegram-broadcast";
import { SITE_URL } from "@/lib/constants/site";
import { withCron } from "@/lib/server/ops-log";

type DueArticle = { id: string; title: string; slug: string; category?: string | null; excerpt?: string | null };

// Called by Vercel Cron every hour: 0 * * * *
export const GET = withCron("publish-scheduled", async () => {
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const now = new Date().toISOString();

  const { data: due, error } = await untypedFrom(db, "news")
    .select("id, title, slug, category, excerpt")
    .eq("status", "draft")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now) as { data: DueArticle[] | null; error: unknown };

  if (error || !due || due.length === 0)
    return NextResponse.json({ ok: true, published: 0 });

  const ids = due.map((d) => d.id);
  await untypedFrom(db, "news")
    .update({ status: "published", scheduled_at: null })
    .in("id", ids);

  revalidatePath("/news", "layout");
  revalidatePath("/", "layout");

  // Send notifications for each auto-published article
  const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const autoEnabled = settingsMap["integrations.tg_auto_scheduled"] !== "false";

  if (autoEnabled) {
    const siteUrl = SITE_URL;

    for (const article of due) {
      const articleUrl = `${siteUrl}/news/${article.slug}`;
      const payload = {
        title: "📰 Bài viết đã được lên lịch đăng",
        subtitle: vnNow(),
        sections: [
          {
            icon: "🗓",
            heading: article.title,
            rows: [
              ...(article.category ? [{ label: "Danh mục", value: article.category }] : []),
              { label: "Đăng bởi", value: "Lịch tự động" },
            ],
          },
        ],
        actions: [{ label: "Xem bài viết", url: articleUrl }],
        footer: "⏰ Arex Cron",
      };

      void Promise.allSettled([
        sendTelegramNotification(payload),
        sendDiscordInternalNotification(payload, DISCORD_COLORS.info),
        sendUserTelegramNotification(payload),
        sendDiscordPublicNotification(payload, DISCORD_COLORS.info),
        sendPushNotification("📰 Tin tức mới", article.title, `/news/${article.slug}`),
        notifyUserNewArticle(article, siteUrl),
        broadcastToSubscribers(
          `📰 <b>BÀI VIẾT MỚI</b>\n\n<b>${article.title}</b>${article.category ? `\n🏷 ${article.category}` : ""}\n\n<a href="${siteUrl}/news/${article.slug}">👉 Đọc ngay</a>  ·  <a href="${siteUrl}/tg">🎮 Mini App</a>`,
        ),
      ]);
    }
  }

  return NextResponse.json({ ok: true, published: ids.length, titles: due.map((d) => d.title) });
});
