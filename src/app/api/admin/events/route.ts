import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validators/event";
import {
  createEvent,
  deleteEvent,
  getEventsAdmin,
  getSettings,
  updateEvent,
} from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getEventStatusInVietnam } from "@/lib/utils/vietnam-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";

async function getAdminName(): Promise<string> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return "Admin";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Admin";
  const { data: profile } = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle() as { data: { display_name: string | null } | null };
  return profile?.display_name || user.email?.split("@")[0] || "Admin";
}

function normalizeUrlField(raw: unknown): string {
  const str = String(raw ?? "").trim();
  if (!str) return "";
  try { new URL(str); return str; } catch { return ""; }
}

function notifyEventChange(
  event: {
    title: string; start_date: string; end_date: string;
    server_region?: string | null; link?: string | null; id: string;
    description?: string | null; image_url?: string | null; thumbnail_url?: string | null;
  },
  action: "created" | "updated" | "deleted",
  adminName: string,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
  const fmtDateTime = (d: string) => {
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? "—" : t.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    }).replace(",", " ·");
  };
  const eventUrl = `${siteUrl}/events/${event.id}`;
  const image = event.image_url || event.thumbnail_url || undefined;
  const desc = (event.description ?? "").replace(/\s+/g, " ").trim();

  const titles: Record<typeof action, string> = {
    created: "🗓️ Sự kiện mới được đăng",
    updated: "✏️ Sự kiện đã được cập nhật",
    deleted: "🗑️ Sự kiện đã bị xóa",
  };
  const icons: Record<typeof action, string> = { created: "🎉", updated: "🔄", deleted: "🗑️" };
  const actionLabel: Record<typeof action, string> = { created: "Đăng bởi", updated: "Cập nhật bởi", deleted: "Xóa bởi" };

  const payload = {
    title: titles[action],
    subtitle: vnNow(),
    ...(action !== "deleted" && image ? { imageUrl: image } : {}),
    sections: [
      {
        icon: icons[action],
        heading: event.title,
        rows: [
          ...(action !== "deleted" ? [
            { label: "🕐 Bắt đầu", value: fmtDateTime(event.start_date) },
            { label: "🏁 Kết thúc", value: fmtDateTime(event.end_date) },
          ] : []),
          ...(event.server_region ? [{ label: "🌐 Khu vực", value: event.server_region }] : []),
          ...(action !== "deleted" && desc ? [{ label: "📝 Mô tả", value: desc.slice(0, 160) + (desc.length > 160 ? "…" : "") }] : []),
          { label: actionLabel[action], value: adminName },
        ],
      },
    ],
    actions: action !== "deleted"
      ? [
          { label: "🔎 Xem sự kiện", url: eventUrl },
          ...(event.link ? [{ label: "🔗 Link ngoài", url: event.link }] : []),
          { label: "🎮 Mini App", url: `${siteUrl}/tg` },
        ]
      : [],
    footer: "✨ Arex Admin",
  };

  const color = action === "created" ? DISCORD_COLORS.info : action === "deleted" ? DISCORD_COLORS.err : DISCORD_COLORS.warn;

  void Promise.allSettled([
    sendTelegramNotification(payload),
    sendDiscordInternalNotification(payload, color),
    ...(action === "created" ? [sendDiscordPublicNotification(payload, DISCORD_COLORS.info)] : []),
  ]);
}

function notifyEventError(context: string, message: string) {
  void sendTelegramNotification({
    title: "❌ LỖI SỰ KIỆN",
    subtitle: vnNow(),
    sections: [{
      rows: [
        { label: "Nơi xảy ra", value: context, bold: true },
        { label: "Chi tiết", value: message.slice(0, 300), status: "err" },
      ],
    }],
    footer: "⚠️ Arex Event Error",
  }).catch(() => null);
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-events", limit: 80, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }
  try {
    const events = await getEventsAdmin();
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-events", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "events.create" });
  if (denied) {
    return denied;
  }

  try {
    const rawPayload = await request.json();
    const payload = {
      id: rawPayload?.id,
      title: String(rawPayload?.title ?? "").trim(),
      description: String(rawPayload?.description ?? "").trim(),
      start_date: String(rawPayload?.start_date ?? "").trim(),
      end_date: String(rawPayload?.end_date ?? "").trim(),
      image_url: String(rawPayload?.image_url ?? "").trim(),
      thumbnail_url: normalizeUrlField(rawPayload?.thumbnail_url),
      link: normalizeUrlField(rawPayload?.link),
      server_region: typeof rawPayload?.server_region === "string" ? rawPayload.server_region : "",
      status: rawPayload?.status,
    };
    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid event payload.",
          details: parsed.error.issues.map((err) => ({ path: err.path, message: err.message })),
        },
        { status: 400 },
      );
    }

    const adminName = await getAdminName();
    const event = await createEvent({
      ...parsed.data,
      description: sanitizePlainText(parsed.data.description ?? ""),
      title: sanitizePlainText(parsed.data.title),
      thumbnail_url: parsed.data.thumbnail_url || parsed.data.image_url,
      server_region: parsed.data.server_region || null,
      link: parsed.data.link || null,
      status: getEventStatusInVietnam(parsed.data.start_date, parsed.data.end_date),
      view_count: 0,
      created_by_name: adminName,
      updated_by_name: adminName,
    });

    await logAdminActivity({
      action: "EVENT_CREATED",
      targetType: "EVENT",
      targetId: event.id,
      summary: `Tạo sự kiện ${event.title}`,
    });

    const evtSettings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
    const sm = Object.fromEntries(evtSettings.map((s) => [s.key, s.value]));
    const hasTgCreds = !!(sm["integrations.telegram_bot_token"] && sm["integrations.telegram_chat_id"]);
    const hasBotCreds = !!(sm["integrations.telegram_bot_token"]);
    const autoEventsEnabled = sm["integrations.tg_auto_events"] !== "false" && hasTgCreds;
    const autoBroadcastEnabled = sm["integrations.tg_auto_broadcast_dm"] !== "false" && hasBotCreds;

    // Admin bot nội bộ luôn gửi nếu đã cấu hình
    notifyEventChange(event, "created", adminName);

    if (autoEventsEnabled) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site";
      if (autoBroadcastEnabled) {
        import("@/lib/server/telegram-broadcast").then(({ broadcastToSubscribers }) => {
          const start = new Date(event.start_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
          const text = `📅 <b>SỰ KIỆN MỚI</b>\n\n<b>${event.title}</b>\n🗓 Bắt đầu: ${start}${event.server_region ? `\n🌐 Server: ${event.server_region}` : ""}\n\n<a href="${siteUrl}/events/${event.id}">👉 Xem chi tiết</a>  ·  <a href="${siteUrl}/tg">🎮 Mini App</a>`;
          broadcastToSubscribers(text).catch(() => null);
        });
      }

      import("@/lib/server/zalo-notify").then(({ notifyNewEvent }) => {
        notifyNewEvent(event.title, event.start_date, event.link ?? undefined).catch(() => {});
      });
      import("@/lib/server/push-notify").then(({ sendPushNotification }) => {
        sendPushNotification(`SỰ KIỆN MỚI: ${event.title}`, `Bắt đầu: ${new Date(event.start_date).toLocaleDateString("vi-VN")}`, "/events").catch(() => {});
      });
      import("@/lib/server/user-notify").then(({ notifyUserNewEvent }) => {
        notifyUserNewEvent(event, process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site");
      });
    }
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
    revalidatePath("/", "layout");

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event.";
    notifyEventError("POST /api/admin/events (tạo sự kiện)", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-events", limit: 30, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "events.edit" });
  if (denied) {
    return denied;
  }

  try {
    const rawPayload = await request.json();
    const payload = {
      id: rawPayload?.id,
      title: String(rawPayload?.title ?? "").trim(),
      description: String(rawPayload?.description ?? "").trim(),
      start_date: String(rawPayload?.start_date ?? "").trim(),
      end_date: String(rawPayload?.end_date ?? "").trim(),
      image_url: String(rawPayload?.image_url ?? "").trim(),
      thumbnail_url: normalizeUrlField(rawPayload?.thumbnail_url),
      link: normalizeUrlField(rawPayload?.link),
      server_region: typeof rawPayload?.server_region === "string" ? rawPayload.server_region : "",
      status: rawPayload?.status,
    };

    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        {
          error: "Invalid event payload.",
          details: parsed.success ? [] : parsed.error.issues.map((err) => ({ path: err.path, message: err.message })),
        },
        { status: 400 },
      );
    }

    const adminName = await getAdminName();
    const event = await updateEvent(parsed.data.id, {
      ...parsed.data,
      title: sanitizePlainText(parsed.data.title),
      description: sanitizePlainText(parsed.data.description ?? ""),
      thumbnail_url: parsed.data.thumbnail_url || parsed.data.image_url,
      server_region: parsed.data.server_region || null,
      link: parsed.data.link || null,
      status: getEventStatusInVietnam(parsed.data.start_date, parsed.data.end_date),
      updated_by_name: adminName,
    });

    await logAdminActivity({
      action: "EVENT_UPDATED",
      targetType: "EVENT",
      targetId: event.id,
      summary: `Cập nhật sự kiện ${event.title}`,
    });

    notifyEventChange(event, "updated", adminName);

    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
    revalidatePath("/", "layout");

    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event.";
    notifyEventError("PATCH /api/admin/events (cập nhật sự kiện)", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-events", limit: 40, windowMs: 60_000 });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ capability: "events.delete" });
  if (denied) {
    return denied;
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  try {
    const adminName = await getAdminName();
    await deleteEvent(payload.id);
    await logAdminActivity({
      action: "EVENT_DELETED",
      targetType: "EVENT",
      targetId: payload.id,
      summary: "Xóa sự kiện",
    });
    notifyEventChange(
      { id: payload.id, title: `ID: ${payload.id}`, start_date: "", end_date: "" },
      "deleted",
      adminName,
    );
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event.";
    notifyEventError("DELETE /api/admin/events (xóa sự kiện)", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
