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
/** Danh sách nhóm/chat nhận thông báo, mỗi dòng một id. */
export const ZALO_CHAT_IDS_KEY = "integrations.zalo_bot_chat_ids";

/**
 * "configured" = đúng những nhóm admin đã chọn; "all" = mọi chat từng nhắn bot;
 * "auto" = có chọn thì gửi đúng nhóm đã chọn, chưa chọn gì thì gửi tất cả.
 */
export type BroadcastTarget = "configured" | "all" | "auto";
export type BroadcastResult = {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  reason?: string;
  results: { chat_id: string; ok: boolean }[];
};

/** Tách danh sách id: xuống dòng, dấu phẩy hay chấm phẩy đều nhận. */
export function parseChatIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean))];
}

/** Nhóm/chat admin đã chọn. Vẫn đọc ô một-chat cũ để cấu hình sẵn không mất. */
export async function getConfiguredChatIds(): Promise<string[]> {
  const settings = await getSettings().catch(() => []);
  const get = (key: string) => settings.find((s) => s.key === key)?.value;
  const many = parseChatIds(get(ZALO_CHAT_IDS_KEY));
  if (many.length) return many;
  const legacy = get(ZALO_CHAT_ID_KEY)?.trim() || (process.env.ZALO_BOT_CHAT_ID?.trim() ?? "");
  return legacy ? parseChatIds(legacy) : [];
}

export async function resolveZaloTargets(target: BroadcastTarget): Promise<string[]> {
  if (target === "configured") return getConfiguredChatIds();
  if (target === "auto") {
    const chosen = await getConfiguredChatIds();
    if (chosen.length) return chosen;
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

  const target = opts.target ?? "auto";
  const chatIds = await resolveZaloTargets(target);
  if (!chatIds.length) {
    return {
      ok: false,
      reason: target === "configured" ? "chat_id_not_configured" : "no_chats_yet",
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
