import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getSettings } from "@/lib/data/content-service";
import {
  getZaloBotToken,
  isValidZaloBotToken,
  sendZaloBotMessage,
  sendZaloBotPhoto,
} from "@/lib/server/zalo-bot";

/**
 * Thông báo nhanh qua bot Zalo.
 * POST { text, target: "default" | "all", image_url?, title? }
 */

// Gửi cả nghìn chat trong một request là chắc chắn quá hạn hàm. Chặn ở đây và
// nói rõ còn bao nhiêu chưa gửi, hơn là im lặng cắt ngang giữa chừng.
const MAX_TARGETS = 200;

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

  const token = await getZaloBotToken();
  if (!token || !isValidZaloBotToken(token)) {
    return NextResponse.json(
      { ok: false, reason: token ? "bot_token_malformed" : "bot_token_not_configured" },
      { status: 400 },
    );
  }

  const chatIds = await resolveTargets(target);
  if (!chatIds.length) {
    return NextResponse.json(
      {
        ok: false,
        reason: target === "all" ? "no_chats_yet" : "chat_id_not_configured",
        hint:
          target === "all"
            ? "Chưa ai nhắn bot nên không có chat nào để gửi. Nhắn cho bot một câu rồi thử lại."
            : "Chưa đặt Chat ID nhận thông báo — bấm Lấy Chat ID ở trên rồi Lưu.",
      },
      { status: 400 },
    );
  }

  const message = title ? `🔔 ${title}\n\n${text}` : text;
  const results: { chat_id: string; ok: boolean }[] = [];
  // Tuần tự chứ không bắn song song: Zalo có giới hạn tốc độ, gửi ồ ạt là bị
  // chặn hàng loạt rồi không biết cái nào thật sự tới nơi.
  for (const chatId of chatIds.slice(0, MAX_TARGETS)) {
    const ok = image
      ? await sendZaloBotPhoto(token, chatId, image, message)
      : await sendZaloBotMessage(token, chatId, message);
    results.push({ chat_id: chatId, ok });
  }

  const sent = results.filter((r) => r.ok).length;
  await logAdminActivity({
    action: "ZALO_NOTIFY_SENT",
    targetType: "SETTING",
    targetId: "integrations.zalo_bot",
    summary: `Gửi thông báo Zalo tới ${sent}/${results.length} chat`,
  });

  return NextResponse.json({
    ok: sent > 0,
    sent,
    failed: results.length - sent,
    skipped: Math.max(0, chatIds.length - MAX_TARGETS),
    results,
  });
}

async function resolveTargets(target: "default" | "all"): Promise<string[]> {
  if (target === "default") {
    const settings = await getSettings().catch(() => []);
    const configured =
      settings.find((s) => s.key === "integrations.zalo_bot_chat_id")?.value?.trim() ||
      (process.env.ZALO_BOT_CHAT_ID?.trim() ?? "");
    return configured ? [configured] : [];
  }

  const db = createAdminSupabaseClient();
  if (!db) return [];
  const { data } = (await untypedFrom(db, "zalo_bot_chats")
    .select("chat_id")
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(MAX_TARGETS + 1)) as { data: { chat_id: string }[] | null };
  return (data ?? []).map((r) => r.chat_id).filter(Boolean);
}
