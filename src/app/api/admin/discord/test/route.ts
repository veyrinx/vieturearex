import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { sendDiscordInternalNotification, sendDiscordPublicNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";
import { vnNow } from "@/lib/server/telegram-notify";

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { channel?: string };
  const channel = body.channel === "public" ? "public" : "internal";

  const payload = {
    title: channel === "internal" ? "🔔 TEST — Discord Nội Bộ" : "📢 TEST — Discord Public",
    subtitle: `Gửi lúc ${vnNow()} (ICT)`,
    sections: [
      {
        icon: "✅",
        heading: "Kết nối thành công",
        rows: [
          { label: "Kênh", value: channel === "internal" ? "Nội bộ (internal)" : "Public" },
          { label: "Trạng thái", value: "Hoạt động bình thường", status: "ok" as const },
          {
            label: "Tính năng",
            value: channel === "internal"
              ? "CSKH alerts, team join, bảo mật, báo cáo ngày"
              : "Bài viết mới, sự kiện, cập nhật Free Fire",
          },
        ],
      },
    ],
    footer: "🧪 Arex Discord Test",
  };

  const result = channel === "internal"
    ? await sendDiscordInternalNotification(payload, DISCORD_COLORS.ok)
    : await sendDiscordPublicNotification(payload, DISCORD_COLORS.info);

  if (result.sent) {
    return NextResponse.json({ ok: true, channel });
  }

  return NextResponse.json(
    { ok: false, channel, reason: (result as { reason?: string }).reason ?? "unknown" },
    { status: 400 },
  );
}
