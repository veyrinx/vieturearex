import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { bot?: string };
  const bot = body.bot === "user" ? "user" : "admin";

  const payload = {
    title: bot === "admin" ? "🔔 TEST — Bot Admin" : "📢 TEST — Bot User",
    subtitle: `Gửi lúc ${vnNow()} (ICT)`,
    sections: [
      {
        icon: "✅",
        heading: "Kết nối thành công",
        rows: [
          { label: "Bot", value: bot === "admin" ? "Admin (nội bộ)" : "User (public)" },
          { label: "Trạng thái", value: "Hoạt động bình thường", status: "ok" as const },
          { label: "Tính năng", value: bot === "admin"
            ? "Yêu cầu team, bảo mật, báo cáo ngày, CSKH, FF version"
            : "Sự kiện mới, bài viết mới, FF update" },
        ],
      },
    ],
    footer: "🧪 Arex Test",
  };

  const result = bot === "admin"
    ? await sendTelegramNotification(payload)
    : await sendUserTelegramNotification(payload);

  if (result.sent) {
    return NextResponse.json({ ok: true, bot });
  }

  return NextResponse.json(
    { ok: false, bot, reason: (result as { reason?: string; error?: string }).reason ?? (result as { error?: string }).error ?? "unknown" },
    { status: 400 },
  );
}
