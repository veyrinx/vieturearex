import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validators/event";
import {
  createEvent,
  deleteEvent,
  getEventsAdmin,
  updateEvent,
} from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getEventStatusInVietnam } from "@/lib/utils/vietnam-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    // Gửi thông báo Zalo + Push + Telegram user khi tạo sự kiện mới
    import("@/lib/server/zalo-notify").then(({ notifyNewEvent }) => {
      notifyNewEvent(event.title, event.start_date, event.link ?? undefined).catch(() => {});
    });
    import("@/lib/server/push-notify").then(({ sendPushNotification }) => {
      sendPushNotification(`SỰ KIỆN MỚI: ${event.title}`, `Bắt đầu: ${new Date(event.start_date).toLocaleDateString("vi-VN")}`, "/events").catch(() => {});
    });
    import("@/lib/server/user-notify").then(({ notifyUserNewEvent }) => {
      notifyUserNewEvent(event, process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site");
    });
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
    revalidatePath("/", "layout");

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event.";
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
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
    revalidatePath("/", "layout");

    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event.";
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

  await deleteEvent(payload.id);
  await logAdminActivity({
    action: "EVENT_DELETED",
    targetType: "EVENT",
    targetId: payload.id,
    summary: "Xóa sự kiện",
  });
  revalidatePath("/events", "layout");
  revalidatePath("/calendar", "layout");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
