import "server-only";
import { getSettings } from "@/lib/data/content-service";

/**
 * Zalo Bot Platform (bot.zapps.vn) — KHÔNG phải OA.
 *
 * API bắt chước Telegram: gọi `https://bot-api.zapps.vn/bot<token>/<method>`,
 * trả `{ ok, result }`. Khác Telegram ở 3 chỗ phải nhớ:
 *   1. chat_id / user id là CHUỖI, không phải số.
 *   2. Không có parse_mode → mọi tin phải là chữ trơn, link để trần.
 *   3. Không có inline keyboard → điều hướng bằng lệnh + link.
 *
 * Token lấy ở bot.zapps.vn, lưu tại settings `integrations.zalo_bot_token`
 * (hoặc biến môi trường ZALO_BOT_TOKEN).
 */

const API_BASE = "https://bot-api.zapps.vn";

export const ZALO_BOT_TOKEN_KEY = "integrations.zalo_bot_token";

export async function getZaloBotToken(): Promise<string> {
  const settings = await getSettings().catch(() => []);
  const fromSettings = settings.find((s) => s.key === ZALO_BOT_TOKEN_KEY)?.value?.trim() ?? "";
  // "enc:" còn nguyên = APP_SECRET lệch, token không giải mã được → coi như chưa có.
  if (fromSettings && !fromSettings.startsWith("enc:")) return fromSettings;
  return process.env.ZALO_BOT_TOKEN?.trim() ?? "";
}

type ZaloBotResponse<T> = { ok?: boolean; result?: T; error_code?: number; description?: string };

async function callOnce<T>(
  token: string,
  method: string,
  verb: "GET" | "POST",
  payload: Record<string, unknown>,
): Promise<{ status: number; data: ZaloBotResponse<T> } | null> {
  const base = `${API_BASE}/bot${token}/${method}`;
  const url =
    verb === "GET" && Object.keys(payload).length
      ? `${base}?${new URLSearchParams(
          Object.entries(payload).map(([k, v]) => [k, String(v)]),
        ).toString()}`
      : base;

  const res = await fetch(url, {
    method: verb,
    ...(verb === "POST"
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) return null;
  const data = (await res.json().catch(() => ({}))) as ZaloBotResponse<T>;
  return { status: res.status, data };
}

/** Các method đọc — Zalo phục vụ bằng GET, POST vào là 404/405. */
const GET_METHODS = new Set(["getme", "getupdates", "getwebhookinfo", "getfile"]);

export async function zaloBotApi<T = unknown>(
  token: string,
  method: string,
  payload: Record<string, unknown> = {},
): Promise<ZaloBotResponse<T>> {
  const primary: "GET" | "POST" = GET_METHODS.has(method.toLowerCase()) ? "GET" : "POST";

  let res = await callOnce<T>(token, method, primary, payload);
  // Tài liệu Zalo Bot còn nhảy nhót giữa GET/POST tuỳ method — sai động từ thì
  // nhận 404/405 chứ không phải lỗi thật, nên thử nốt động từ kia rồi mới kêu.
  if (!res || res.status === 404 || res.status === 405) {
    const fallback = await callOnce<T>(token, method, primary === "GET" ? "POST" : "GET", payload);
    if (fallback) res = fallback;
  }

  if (!res) return { ok: false, description: "network_error" };
  const { status, data } = res;
  if (status >= 400 && data.ok === undefined) {
    return { ok: false, description: data.description ?? `http_${status}` };
  }
  return data;
}

/** Zalo cắt tin dài — chia theo dòng cho khỏi mất chữ. */
function splitMessage(text: string, max = 1800): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if (buf.length + line.length + 1 > max) {
      if (buf) parts.push(buf);
      buf = line.length > max ? line.slice(0, max) : line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

export async function sendZaloBotMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  let ok = true;
  for (const chunk of splitMessage(text)) {
    const res = await zaloBotApi(token, "sendMessage", { chat_id: chatId, text: chunk });
    if (res.ok === false) {
      console.warn("[zalo-bot] sendMessage lỗi:", res.error_code, res.description);
      ok = false;
    }
  }
  return ok;
}

export async function sendZaloBotPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption?: string,
): Promise<boolean> {
  const res = await zaloBotApi(token, "sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    ...(caption ? { caption } : {}),
  });
  return res.ok !== false;
}

// ── Chuẩn hoá update ────────────────────────────────────────────────────────

export type ZaloBotMessage = {
  message_id?: string;
  date?: string | number;
  text?: string;
  caption?: string;
  chat?: { id?: string | number; chat_type?: string; type?: string };
  from?: { id?: string | number; display_name?: string; name?: string };
  photo?: { file_id?: string; url?: string } | { file_id?: string; url?: string }[];
  photo_url?: string;
};

export type NormalizedUpdate = {
  chatId: string;
  fromId: string;
  fromName: string;
  text: string;
  photoUrl: string | null;
  isGroup: boolean;
  eventName: string;
};

/**
 * Zalo Bot gửi update ở vài dạng tuỳ phiên bản: `{update_id, message}` kiểu
 * Telegram, `{event_name, message}` kiểu OA, hoặc bọc trong `result[]` khi lấy
 * bằng getUpdates. Nhận hết cho chắc, thiếu chat id thì bỏ qua.
 */
export function normalizeZaloUpdate(raw: unknown): NormalizedUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  const container = (Array.isArray(body.result) ? body.result[0] : body) as Record<string, unknown> | undefined;
  if (!container) return null;

  const msg = (container.message ?? container.edited_message ?? container) as ZaloBotMessage;
  const chatId = msg.chat?.id ?? (container.chat as { id?: string })?.id;
  if (chatId === undefined || chatId === null || chatId === "") return null;

  const photoField = msg.photo;
  const photo = Array.isArray(photoField) ? photoField[photoField.length - 1] : photoField;

  const chatType = String(msg.chat?.chat_type ?? msg.chat?.type ?? "").toUpperCase();

  return {
    chatId: String(chatId),
    fromId: String(msg.from?.id ?? ""),
    fromName: (msg.from?.display_name || msg.from?.name || "bạn").trim(),
    text: (msg.text ?? msg.caption ?? "").trim(),
    photoUrl: photo?.url ?? msg.photo_url ?? null,
    isGroup: chatType.includes("GROUP"),
    eventName: String(container.event_name ?? body.event_name ?? ""),
  };
}

/** "Điểm Danh!" → "diem danh" */
export function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Người dùng Zalo hiếm khi gõ dấu "/", và lệnh hay là 2 chữ ("điểm danh",
 * "liên kết ABC123"). Nên trả cả dạng 1 chữ lẫn 2 chữ dính liền để bên gọi thử
 * lần lượt; arg giữ nguyên chữ gốc vì mã liên kết cần đúng ký tự.
 */
export function normalizeCommand(text: string): {
  one: string;
  two: string;
  argAfterOne: string;
  argAfterTwo: string;
} {
  const raw = text.trim().replace(/^\//, "").split(/\s+/);
  const words = deaccent(raw.join(" ")).split(/\s+/).filter(Boolean);
  return {
    one: words[0] ?? "",
    two: words.slice(0, 2).join(""),
    argAfterOne: raw.slice(1).join(" ").trim(),
    argAfterTwo: raw.slice(2).join(" ").trim(),
  };
}
