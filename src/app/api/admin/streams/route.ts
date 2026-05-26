import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { sendPushNotification } from "@/lib/server/push-notify";
import {
  getStreams, createStream, updateStream, deleteStream,
  buildThumbnailUrl, getStreamCategories, saveStreamCategories,
} from "@/lib/server/stream-service";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";

const streamSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(200),
  youtube_url: z.string().min(1),
  thumbnail_url: z.string().optional().default(""),
  scheduled_at: z.string().min(1),
  status: z.enum(["live", "upcoming", "ended"]).default("upcoming"),
  category: z.string().optional().default("ESPORTS"),
});

const categorySchema = z.object({
  action: z.enum(["add", "remove"]),
  category: z.string().min(1).max(60),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-streams", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;
  const [streams, categories] = await Promise.all([getStreams(), getStreamCategories()]);
  return NextResponse.json({ streams, categories });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-streams", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const payload = await request.json().catch(() => null);

  // Handle category management
  const catParsed = categorySchema.safeParse(payload);
  if (catParsed.success) {
    const current = await getStreamCategories();
    const cat = catParsed.data.category.trim().toUpperCase();
    if (catParsed.data.action === "add") {
      if (current.includes(cat)) return NextResponse.json({ error: "Danh mục đã tồn tại." }, { status: 400 });
      await saveStreamCategories([...current, cat]);
    } else {
      if (current.length <= 1) return NextResponse.json({ error: "Cần giữ ít nhất 1 danh mục." }, { status: 400 });
      await saveStreamCategories(current.filter((c) => c !== cat));
    }
    return NextResponse.json({ categories: await getStreamCategories() });
  }

  const parsed = streamSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid stream payload." }, { status: 400 });

  const stream = await createStream({
    title: sanitizePlainText(parsed.data.title),
    youtube_url: sanitizePlainText(parsed.data.youtube_url),
    thumbnail_url: parsed.data.thumbnail_url || buildThumbnailUrl(parsed.data.youtube_url),
    scheduled_at: parsed.data.scheduled_at,
    status: parsed.data.status,
    category: parsed.data.category || "ESPORTS",
  });

  await logAdminActivity({ action: "STREAM_CREATED", targetType: "STREAM", targetId: stream.id, summary: `Tạo stream ${stream.title}` });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
  const isLive = stream.status === "live";
  const notifyPayload = {
    title: isLive ? "🔴 ĐANG PHÁT TRỰC TIẾP!" : "📅 Lịch phát trực tiếp mới",
    subtitle: vnNow(),
    sections: [{ icon: isLive ? "🔴" : "📺", heading: stream.title, rows: [
      { label: "Danh mục", value: stream.category ?? "ESPORTS" },
      { label: "Thời gian", value: new Date(stream.scheduled_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
    ]}],
    actions: [{ label: "Xem ngay", url: `${siteUrl}/esports` }],
    footer: "📺 Arex Esports",
  };
  void Promise.allSettled([
    sendTelegramNotification(notifyPayload),
    sendDiscordInternalNotification(notifyPayload, DISCORD_COLORS.info),
    sendLarkNotification(notifyPayload, "main"),
    sendUserTelegramNotification(notifyPayload),
    sendDiscordPublicNotification(notifyPayload, DISCORD_COLORS.info),
    sendPushNotification(isLive ? "🔴 Phát trực tiếp ngay!" : "📺 Lịch stream mới", stream.title, "/esports").catch(() => null),
  ]);
  return NextResponse.json({ stream }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-streams", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = streamSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: "Invalid stream payload." }, { status: 400 });

  const stream = await updateStream(parsed.data.id, {
    title: sanitizePlainText(parsed.data.title),
    youtube_url: sanitizePlainText(parsed.data.youtube_url),
    thumbnail_url: parsed.data.thumbnail_url || buildThumbnailUrl(parsed.data.youtube_url),
    scheduled_at: parsed.data.scheduled_at,
    status: parsed.data.status,
    category: parsed.data.category || "ESPORTS",
  });

  await logAdminActivity({ action: "STREAM_UPDATED", targetType: "STREAM", targetId: stream.id, summary: `Cập nhật stream ${stream.title}` });

  // Notify all channels when stream goes live
  if (stream.status === "live") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    const livePayload = {
      title: "🔴 ĐANG PHÁT TRỰC TIẾP!",
      subtitle: vnNow(),
      sections: [{ icon: "🔴", heading: stream.title, rows: [
        { label: "Danh mục", value: stream.category ?? "ESPORTS" },
      ]}],
      actions: [{ label: "Xem ngay", url: `${siteUrl}/esports` }],
      footer: "📺 Arex Esports",
    };
    void Promise.allSettled([
      sendTelegramNotification(livePayload),
      sendDiscordInternalNotification(livePayload, DISCORD_COLORS.ok),
      sendLarkNotification(livePayload, "main"),
      sendUserTelegramNotification(livePayload),
      sendDiscordPublicNotification(livePayload, DISCORD_COLORS.ok),
      sendPushNotification("🔴 Phát trực tiếp ngay!", stream.title, "/esports").catch(() => null),
    ]);
  }
  return NextResponse.json({ stream });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-streams", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const payload = await request.json().catch(() => null) as { id?: string } | null;
  if (!payload?.id) return NextResponse.json({ error: "Missing stream id." }, { status: 400 });

  await deleteStream(payload.id);
  await logAdminActivity({ action: "STREAM_DELETED", targetType: "STREAM", targetId: payload.id, summary: "Xóa stream" });
  return NextResponse.json({ ok: true });
}
