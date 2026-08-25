import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  getZaloBotToken,
  isValidZaloBotToken,
  sendZaloBotMessage,
  sendZaloBotPhoto,
} from "@/lib/server/zalo-bot";

/**
 * Đẩy một tin ra bot Zalo — dùng cho cả nút "Thông báo nhanh" trong Admin lẫn
 * luồng tự đăng khi có tin/sự kiện mới.
 *
 * Trước đây chỉ Telegram được nối vào luồng tự đăng; sendZaloNotification viết
 * ra rồi nhưng không chỗ nào gọi, nên bot Zalo chẳng bao giờ tự gửi gì.
 */

// Gửi cả nghìn chat trong một request là chắc chắn quá hạn hàm. Chặn ở đây và
// nói rõ còn bao nhiêu chưa gửi, hơn là im lặng cắt ngang giữa chừng.
export const MAX_BROADCAST_TARGETS = 200;

export const ZALO_AUTO_NEWS_KEY = "integrations.zalo_auto_news";
export const ZALO_AUTO_EVENTS_KEY = "integrations.zalo_auto_events";
export const ZALO_CHAT_ID_KEY = "integrations.zalo_bot_chat_id";

export type BroadcastTarget = "default" | "all";
export type BroadcastResult = {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  reason?: string;
  results: { chat_id: string; ok: boolean }[];
};

export async function resolveZaloTargets(target: BroadcastTarget): Promise<string[]> {
  if (target === "default") {
    const settings = await getSettings().catch(() => []);
    const configured =
      settings.find((s) => s.key === ZALO_CHAT_ID_KEY)?.value?.trim() ||
      (process.env.ZALO_BOT_CHAT_ID?.trim() ?? "");
    return configured ? [configured] : [];
  }

  const db = createAdminSupabaseClient();
  if (!db) return [];
  const { data } = (await untypedFrom(db, "zalo_bot_chats")
    .select("chat_id")
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(MAX_BROADCAST_TARGETS + 1)) as { data: { chat_id: string }[] | null };
  return (data ?? []).map((r) => r.chat_id).filter(Boolean);
}

export async function broadcastZaloBot(opts: {
  text: string;
  imageUrl?: string;
  target?: BroadcastTarget;
}): Promise<BroadcastResult> {
  const empty = { sent: 0, failed: 0, skipped: 0, results: [] };
  const token = await getZaloBotToken();
  if (!token || !isValidZaloBotToken(token)) {
    return { ok: false, reason: token ? "bot_token_malformed" : "bot_token_not_configured", ...empty };
  }

  const target = opts.target ?? "all";
  const chatIds = await resolveZaloTargets(target);
  if (!chatIds.length) {
    return {
      ok: false,
      reason: target === "all" ? "no_chats_yet" : "chat_id_not_configured",
      ...empty,
    };
  }

  const results: { chat_id: string; ok: boolean }[] = [];
  // Tuần tự chứ không bắn song song: Zalo có giới hạn tốc độ, gửi ồ ạt là bị
  // chặn hàng loạt rồi không biết cái nào thật sự tới nơi.
  for (const chatId of chatIds.slice(0, MAX_BROADCAST_TARGETS)) {
    const ok = opts.imageUrl
      ? await sendZaloBotPhoto(token, chatId, opts.imageUrl, opts.text)
      : await sendZaloBotMessage(token, chatId, opts.text);
    results.push({ chat_id: chatId, ok });
  }

  const sent = results.filter((r) => r.ok).length;
  return {
    ok: sent > 0,
    sent,
    failed: results.length - sent,
    skipped: Math.max(0, chatIds.length - MAX_BROADCAST_TARGETS),
    results,
  };
}

/** Cờ tự đăng: chưa đặt bao giờ thì coi như BẬT, giống bên Telegram. */
export async function isZaloAutoPostOn(key: string): Promise<boolean> {
  const settings = await getSettings().catch(() => []);
  const value = settings.find((s) => s.key === key)?.value;
  if (value === undefined || value.trim() === "") return true;
  return value !== "false" && value !== "0";
}
