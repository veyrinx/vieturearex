import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { endGiveaway } from "@/lib/server/discord-handlers";
import { discordEnv, sendChannelMessage } from "@/lib/server/discord-api";
import { BRAND, SITE_URL, discordTime, embed, linkButton, row } from "@/lib/server/discord-ui";

/**
 * Nhịp định kỳ của bot: chốt giveaway tới hạn và nhắc sự kiện sắp bắt đầu.
 *
 * Vì sao không dùng Vercel Cron: cron ở đây chạy theo ngày, còn giveaway cần
 * độ chính xác phút. Bot gateway ở `discord-bot/` chạy 24/7 nên nó gọi endpoint
 * này mỗi phút. Endpoint vẫn phải tự bảo vệ bằng BOT_API_SECRET vì nó nằm trên
 * internet công cộng.
 *
 * An toàn khi gọi lại nhiều lần: giveaway đã chốt bị bỏ qua, sự kiện đã nhắc
 * được ghi vào `discord_event_reminders`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_SECRET = process.env.BOT_API_SECRET;

/** Nhắc trước khi sự kiện bắt đầu trong khoảng này. */
const REMIND_WINDOW_MS = 24 * 3_600_000;

function authorized(req: NextRequest): boolean {
  return !!BOT_SECRET && req.headers.get("x-bot-secret") === BOT_SECRET;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [giveaways, events] = await Promise.all([tickGiveaways(), tickEvents()]);
  return NextResponse.json({ ok: true, giveaways, events });
}

async function tickGiveaways(): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) return 0;

  const { data } = (await untypedFrom(db, "discord_giveaways")
    .select("id")
    .eq("ended", false)
    .lte("ends_at", new Date().toISOString())
    .limit(20)) as { data: { id: string }[] | null };

  let done = 0;
  for (const g of data ?? []) {
    if (await endGiveaway(g.id)) done++;
  }
  return done;
}

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  link: string | null;
  image_url: string | null;
};

async function tickEvents(): Promise<number> {
  const db = createAdminSupabaseClient();
  const channelId = discordEnv.eventChannelId;
  if (!db || !channelId) return 0;

  const now = Date.now();
  const { data } = (await untypedFrom(db, "events")
    .select("id, title, start_date, end_date, link, image_url")
    .eq("status", "upcoming")
    .gte("start_date", new Date(now).toISOString())
    .lte("start_date", new Date(now + REMIND_WINDOW_MS).toISOString())
    .limit(10)) as { data: EventRow[] | null };

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const { data: sent } = (await untypedFrom(db, "discord_event_reminders")
    .select("event_id")
    .in("event_id", rows.map((e) => e.id))) as { data: { event_id: string }[] | null };
  const already = new Set((sent ?? []).map((r) => r.event_id));

  let posted = 0;
  for (const e of rows) {
    if (already.has(e.id)) continue;

    const ok = await sendChannelMessage(channelId, {
      embeds: [
        embed({
          title: `⏰ Sắp bắt đầu · ${e.title}`,
          description: `Sự kiện mở ${discordTime(e.start_date, "R")} (${discordTime(e.start_date, "f")}).`,
          color: BRAND.green,
          ...(e.image_url ? { image: { url: e.image_url } } : {}),
          ...(e.end_date ? { fields: [{ name: "Kết thúc", value: discordTime(e.end_date, "d"), inline: true }] } : {}),
        }),
      ],
      components: [
        row(
          linkButton("Chi tiết sự kiện", `${SITE_URL}/su-kien`, "📅"),
          ...(e.link ? [linkButton("Tham gia ngay", e.link, "🔗")] : []),
        ),
      ],
    });

    if (ok) {
      await untypedFrom(db, "discord_event_reminders").insert({ event_id: e.id, kind: "start" } as never);
      posted++;
    }
  }
  return posted;
}
