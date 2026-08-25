import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { broadcastZaloBot } from "@/lib/server/zalo-broadcast";

/**
 * Thông báo nhanh qua bot Zalo.
 * POST { text, target: "default" | "all", image_url?, title? }
 */

const schema = z.object({
  title: z.string().max(120).optional(),
  text: z.string().min(1).max(1800),
  image_url: z.string().url().max(500).optional().or(z.literal("")),
  target: z.enum(["default", "all"]).default("default"),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-zalo-notify", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "settings.edit" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }
  const { title, text, image_url: image, target } = parsed.data;

  const result = await broadcastZaloBot({
    text: title ? `🔔 ${title}\n\n${text}` : text,
    imageUrl: image || undefined,
    target,
  });

  if (!result.ok && result.sent === 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason ?? "send_failed",
        hint:
          result.reason === "no_chats_yet"
            ? "Chưa ai nhắn bot nên không có chat nào để gửi. Nhắn cho bot một câu rồi thử lại."
            : result.reason === "chat_id_not_configured"
              ? "Chưa đặt Chat ID nhận thông báo — bấm Lấy Chat ID ở trên rồi Lưu."
              : result.reason === "bot_token_malformed"
                ? "Zalo Bot Token sai dạng — phải là <số>:<chuỗi>. Dán lại từ bot.zapps.me."
                : undefined,
      },
      { status: 400 },
    );
  }

  await logAdminActivity({
    action: "ZALO_NOTIFY_SENT",
    targetType: "SETTING",
    targetId: "integrations.zalo_bot",
    summary: `Gửi thông báo Zalo tới ${result.sent}/${result.sent + result.failed} chat`,
  });

  return NextResponse.json(result);
}
