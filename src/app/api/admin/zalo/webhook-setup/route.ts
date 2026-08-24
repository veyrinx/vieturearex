import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { SITE_URL } from "@/lib/constants/site";
import { resolveServingOrigin } from "@/lib/server/serving-origin";
import { getZaloBotToken, zaloBotApi, sendZaloBotMessage } from "@/lib/server/zalo-bot";

/**
 * Đăng ký / gỡ webhook cho bot Zalo (bot.zapps.vn).
 * POST { action: "set" | "delete" | "test", chat_id?: string }
 */

function webhookPath(origin: string) {
  return `${origin}/api/zalo/bot`;
}

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { action?: string; chat_id?: string };
  const action = body.action === "delete" ? "delete" : body.action === "test" ? "test" : "set";

  const token = await getZaloBotToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "bot_token_not_configured" }, { status: 400 });
  }

  if (action === "test") {
    const chatId = body.chat_id?.trim();
    if (!chatId) return NextResponse.json({ ok: false, reason: "missing_chat_id" }, { status: 400 });
    const sent = await sendZaloBotMessage(token, chatId, "🧪 Test bot Arex — kết nối OK.");
    return NextResponse.json({ ok: sent, action, chat_id: chatId }, { status: sent ? 200 : 400 });
  }

  // Cùng cách chốt tên miền như bot Telegram: đi theo chuyển hướng để đăng ký
  // đúng nơi trả 2xx, không tới được thì lấy chính nơi admin đang đứng.
  const origin = new URL(request.url).origin;
  const serving = await resolveServingOrigin(SITE_URL, origin);
  const url = webhookPath(serving);
  const switchedFrom = serving === SITE_URL ? null : webhookPath(SITE_URL);
  const secret = process.env.ZALO_BOT_WEBHOOK_SECRET || process.env.CRON_SECRET || "";

  const res =
    action === "delete"
      ? await zaloBotApi(token, "deleteWebhook", {})
      : await zaloBotApi(token, "setWebhook", {
          url,
          ...(secret ? { secret_token: secret } : {}),
        });

  if (res.ok === false) {
    return NextResponse.json(
      { ok: false, reason: res.description ?? "zalo_error" },
      { status: 400 },
    );
  }

  const info = await zaloBotApi<Record<string, unknown>>(token, "getWebhookInfo", {});
  const me = await zaloBotApi<{ display_name?: string; account_name?: string; id?: string }>(token, "getMe", {});

  return NextResponse.json({
    ok: true,
    action,
    webhook_url: action === "set" ? url : null,
    // Không có secret thì ai cũng giả được cập nhật gửi tới webhook.
    secret_configured: Boolean(secret),
    bot: me.result ?? null,
    info: info.result ?? null,
    ...(switchedFrom ? { switched_from: switchedFrom } : {}),
  });
}

// GET — xem webhook hiện tại + bot đang là ai
export async function GET(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const token = await getZaloBotToken();
  if (!token) return NextResponse.json({ ok: false, reason: "bot_token_not_configured" });

  const me = await zaloBotApi<{ display_name?: string; account_name?: string; id?: string }>(token, "getMe", {});
  if (me.ok === false) {
    return NextResponse.json({ ok: false, reason: me.description ?? "zalo_error" });
  }

  const info = await zaloBotApi<{ url?: string }>(token, "getWebhookInfo", {});
  const origin = new URL(request.url).origin;
  const expected = webhookPath(await resolveServingOrigin(SITE_URL, origin));
  const current = info.result?.url ?? "";

  return NextResponse.json({
    ok: true,
    bot: me.result ?? null,
    info: info.result ?? null,
    expected_url: expected,
    // false = webhook đang trỏ sai chỗ → bấm "Đăng ký webhook" lại là xong.
    url_matches: current === expected,
    secret_configured: Boolean(process.env.ZALO_BOT_WEBHOOK_SECRET || process.env.CRON_SECRET),
  });
}
