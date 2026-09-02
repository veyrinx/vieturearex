import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientKey } from "@/lib/server/api-guard";
import { persistBlock, recordFailure } from "@/lib/server/ip-blocker";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { sendDiscordInternalNotification, DISCORD_COLORS } from "@/lib/server/discord-notify";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "track-failure", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const ip = getClientKey(request);
  const { blocked } = recordFailure(ip);

  if (blocked) {
    // Ghi xuống settings để MỌI máy cùng chặn — middleware là nơi thi hành.
    // Trước đây chỗ này chỉ ghi để bảng admin có cái mà hiện, không ai đọc ra
    // để chặn cả.
    await persistBlock({
      ip,
      reason: "5 lần đăng nhập sai liên tiếp",
      by: "auto:login-failure",
    });

    const payload = {
      title: "🚨 IP bị chặn tự động",
      subtitle: vnNow(),
      sections: [{ icon: "🔒", heading: "Chi tiết", rows: [
        { label: "IP", value: ip, mono: true },
        { label: "Lý do", value: "5 lần đăng nhập sai liên tiếp" },
        { label: "Thời hạn chặn", value: "1 giờ" },
      ]}],
      footer: "🔒 Arex Security",
    };
    void Promise.allSettled([
      sendTelegramNotification(payload),
      sendDiscordInternalNotification(payload, DISCORD_COLORS.err),
    ]);
  }

  return NextResponse.json({ ok: true, blocked });
}
