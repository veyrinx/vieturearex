import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";
import { getGroupGreetingConfig, renderGreeting } from "@/lib/server/group-greeting";
import { broadcastZaloBot } from "@/lib/server/zalo-broadcast";

/**
 * Gửi thử lời chào / lời tiễn ra đúng những nhóm sẽ nhận nó thật.
 *
 * POST { kind: "welcome" | "farewell", channel: "zalo" | "telegram" | "all", text?, name? }
 *
 * `text` là bản đang gõ trong Admin (chưa Lưu) — gửi đúng thứ admin đang nhìn
 * mới là thử thật; bỏ trống thì lấy bản đã lưu. Cờ bật/tắt KHÔNG chặn ở đây:
 * bấm nút là cố ý, và "tắt nên không gửi" thì admin đọc ngay trên giao diện.
 */

const TG_TOKEN_KEY = "integrations.telegram_bot_token";
const TG_CHAT_KEY = "integrations.telegram_chat_id";
const TG_USER_TOKEN_KEY = "integrations.telegram_user_bot_token";
const TG_USER_CHAT_KEY = "integrations.telegram_user_chat_id";

const schema = z.object({
  kind: z.enum(["welcome", "farewell"]),
  channel: z.enum(["zalo", "telegram", "all"]).default("all"),
  text: z.string().max(1800).optional(),
  name: z.string().max(80).optional(),
});

type Outcome = { channel: string; ok: boolean; sent: number; detail?: string };

/** Một tin chữ trơn tới một chat Telegram. */
async function sendTelegramText(token: string, chatId: string, text: string): Promise<string | null> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => null);
  if (!res) return "không gọi được api.telegram.org";
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { description?: string };
  return data.description ?? `HTTP ${res.status}`;
}

async function sendTelegram(text: string): Promise<Outcome> {
  const settings = await getSettings().catch(() => []);
  const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";

  const adminToken = get(TG_TOKEN_KEY);
  // Bot User không khai riêng thì dùng chung token bot Admin — giống telegram-notify.
  const targets = [
    { label: "nhóm Admin", token: adminToken, chatId: get(TG_CHAT_KEY) },
    { label: "kênh User", token: get(TG_USER_TOKEN_KEY) || adminToken, chatId: get(TG_USER_CHAT_KEY) },
  ].filter((t) => t.token && t.chatId);

  if (!targets.length) {
    return { channel: "telegram", ok: false, sent: 0, detail: "Chưa khai bot token / chat id Telegram." };
  }
  // "enc:" còn nguyên = APP_SECRET lệch, đem đi gọi chỉ nhận 404 khó hiểu.
  const broken = targets.filter((t) => t.token.startsWith("enc:") || t.chatId.startsWith("enc:"));
  if (broken.length === targets.length) {
    return { channel: "telegram", ok: false, sent: 0, detail: "Token/chat id giải mã hỏng (APP_SECRET lệch)." };
  }

  const results = await Promise.all(
    targets
      .filter((t) => !t.token.startsWith("enc:") && !t.chatId.startsWith("enc:"))
      .map(async (t) => ({ label: t.label, error: await sendTelegramText(t.token, t.chatId, text) })),
  );
  const sent = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error);
  return {
    channel: "telegram",
    ok: sent > 0,
    sent,
    detail: failed.length ? failed.map((f) => `${f.label}: ${f.error}`).join(" · ") : undefined,
  };
}

async function sendZalo(text: string): Promise<Outcome> {
  const result = await broadcastZaloBot({ text, target: "auto" });
  const hint =
    result.reason === "no_chats_yet"
      ? "Chưa có chat nào nhắn bot Zalo."
      : result.reason === "chat_id_not_configured"
        ? "Chưa chọn nhóm Zalo nhận thông báo."
        : result.reason === "bot_token_malformed"
          ? "Zalo Bot Token sai dạng."
          : result.reason === "bot_token_not_configured"
            ? "Chưa khai Zalo Bot Token."
            : result.failed
              ? `${result.failed} chat gửi lỗi.`
              : undefined;
  return { channel: "zalo", ok: result.ok, sent: result.sent, detail: hint };
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-greeting-test", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "settings.edit" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }
  const { kind, channel, text: draft, name } = parsed.data;

  const config = await getGroupGreetingConfig();
  const template =
    draft?.trim() || (kind === "welcome" ? config.welcomeText : config.farewellText);
  const body = renderGreeting(template, name?.trim() || "Minh Anh", "Cộng đồng Arex");
  if (!body) return NextResponse.json({ ok: false, reason: "empty_text" }, { status: 400 });

  const message = `🧪 GỬI THỬ — ${kind === "welcome" ? "lời chào người vào nhóm" : "lời tiễn người rời nhóm"}\n\n${body}`;

  const results: Outcome[] = [];
  if (channel === "zalo" || channel === "all") results.push(await sendZalo(message));
  if (channel === "telegram" || channel === "all") results.push(await sendTelegram(message));

  const sent = results.reduce((n, r) => n + r.sent, 0);
  return NextResponse.json(
    {
      ok: sent > 0,
      sent,
      results,
      // Gửi được nhưng cờ đang tắt: lúc chạy thật sẽ KHÔNG có tin nào — nói ra
      // ngay, không thì admin thấy tin thử rồi yên tâm nhầm.
      disabled_warning:
        (kind === "welcome" && !config.welcomeOn) || (kind === "farewell" && !config.farewellOn)
          ? "Đang TẮT — người ra/vào nhóm thật sẽ không nhận được câu này."
          : null,
    },
    { status: sent > 0 ? 200 : 400 },
  );
}
