import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  sendTelegramNotification,
  sendUserTelegramNotification,
  vnNow,
} from "@/lib/server/telegram-notify";
import { formatVietnamDateTime } from "@/lib/utils/vietnam-time";
import { SITE_URL } from "@/lib/constants/site";

export const runtime = "nodejs";
export const maxDuration = 30;

const SENT_KEY = "cron.event_reminders_sent";
const WINDOW_HOURS = 2;

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  server_region: string | null;
};

type TournamentRow = {
  id: string;
  name: string;
  slug: string;
  start_at: string;
  mode: string;
  prize_pool: string | null;
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, error: "No DB" });

  const { data: sentRow } = (await untypedFrom(db, "settings")
    .select("value")
    .eq("key", SENT_KEY)
    .maybeSingle()) as { data: { value: string } | null };

  let sent: Set<string>;
  try {
    sent = new Set(JSON.parse(sentRow?.value ?? "[]") as string[]);
  } catch {
    sent = new Set();
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const windowIso = windowEnd.toISOString();
  const siteUrl = SITE_URL;

  const results: { type: string; id: string; name: string }[] = [];

  // ── Events ────────────────────────────────────────────────────────────────────
  const { data: events } = (await untypedFrom(db, "events")
    .select("id, title, start_date, server_region")
    .eq("status", "upcoming")
    .gte("start_date", nowIso)
    .lte("start_date", windowIso)) as { data: EventRow[] | null };

  for (const ev of events ?? []) {
    const key = `event:${ev.id}`;
    if (sent.has(key)) continue;

    const payload = {
      title: "⏰ SỰ KIỆN SẮP DIỄN RA",
      subtitle: `Nhắc nhở lúc ${vnNow()} (ICT)`,
      sections: [
        {
          rows: [
            { label: "📌 Tên", value: ev.title, bold: true },
            { label: "🗓 Bắt đầu", value: formatVietnamDateTime(ev.start_date) },
            ...(ev.server_region
              ? [{ label: "🌐 Server", value: ev.server_region }]
              : []),
          ],
        },
      ],
      actions: [{ label: "👉 Xem chi tiết", url: `${siteUrl}/events/${ev.id}` }],
      footer: "🎮 Arex Event Reminder",
    };

    const [a, u] = await Promise.all([
      sendTelegramNotification(payload).catch(() => ({ sent: false })),
      sendUserTelegramNotification(payload).catch(() => ({ sent: false })),
    ]);

    if (a.sent || u.sent) {
      sent.add(key);
      results.push({ type: "event", id: ev.id, name: ev.title });
    }
  }

  // ── Tournaments ───────────────────────────────────────────────────────────────
  const { data: tournaments } = (await untypedFrom(db, "tms_tournaments")
    .select("id, name, slug, start_at, mode, prize_pool")
    .not("start_at", "is", null)
    .gte("start_at", nowIso)
    .lte("start_at", windowIso)
    .in("status", ["registering", "ongoing"])) as { data: TournamentRow[] | null };

  for (const t of tournaments ?? []) {
    const key = `tournament:${t.id}`;
    if (sent.has(key)) continue;

    const payload = {
      title: "🏆 GIẢI ĐẤU SẮP BẮT ĐẦU",
      subtitle: `Nhắc nhở lúc ${vnNow()} (ICT)`,
      sections: [
        {
          rows: [
            { label: "🏆 Tên", value: t.name, bold: true },
            { label: "🗓 Bắt đầu", value: formatVietnamDateTime(t.start_at) },
            { label: "🎮 Thể thức", value: t.mode.toUpperCase() },
            ...(t.prize_pool
              ? [{ label: "💰 Giải thưởng", value: t.prize_pool }]
              : []),
          ],
        },
      ],
      actions: [
        { label: "👉 Xem giải đấu", url: `${siteUrl}/tournaments/${t.slug}` },
      ],
      footer: "🏆 Arex TMS Reminder",
    };

    const [a, u] = await Promise.all([
      sendTelegramNotification(payload).catch(() => ({ sent: false })),
      sendUserTelegramNotification(payload).catch(() => ({ sent: false })),
    ]);

    if (a.sent || u.sent) {
      sent.add(key);
      results.push({ type: "tournament", id: t.id, name: t.name });
    }
  }

  // Persist updated dedup set
  if (results.length > 0) {
    await untypedFrom(db, "settings").upsert(
      { key: SENT_KEY, value: JSON.stringify(Array.from(sent)) } as never,
      { onConflict: "key" } as never,
    );
  }

  return NextResponse.json({ ok: true, notified: results.length, results });
}
