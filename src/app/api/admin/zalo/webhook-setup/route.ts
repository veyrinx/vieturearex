import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { SITE_URL } from "@/lib/constants/site";
import { resolveServingOrigin } from "@/lib/server/serving-origin";
import {
  describeZaloBotToken,
  ensureZaloBotWebhookSecret,
  getZaloBotToken,
  getZaloBotWebhookSecret,
  isValidZaloBotToken,
  sendZaloBotMessage,
  zaloBotApi,
} from "@/lib/server/zalo-bot";

/**
 * Đăng ký / gỡ webhook cho bot Zalo (bot.zapps.me).
 * POST { action: "set" | "delete" | "test", chat_id?: string }
 */

function webhookPath(origin: string) {
  return `${origin}/api/zalo/bot`;
}

/** Gọi thử chính webhook của mình, đúng kiểu Zalo gọi: POST + header secret. */
async function probeOwnWebhook(url: string, secret: string) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Bot-Api-Secret-Token": secret } : {}),
      },
      body: JSON.stringify({ event_name: "webhook_selfcheck" }),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return {
      status: res.status,
      ms: Date.now() - started,
      // 3xx = Zalo sẽ chết lặng ở đây: máy gọi máy không đi theo chuyển hướng.
      redirected_to: res.status >= 300 && res.status < 400 ? res.headers.get("location") : null,
      body: (await res.text().catch(() => "")).slice(0, 200),
    };
  } catch (err) {
    return { status: 0, ms: Date.now() - started, redirected_to: null, body: String(err).slice(0, 200) };
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { action?: string; chat_id?: string };
  const action = body.action === "delete" ? "delete" : body.action === "test" ? "test" : "set";

  const token = await getZaloBotToken();
  // Token sai dạng thì Zalo trả "Not Found" — thông báo không chỉ về đâu cả,
  // nên chặn ngay ở đây, kèm mặt nạ token (chữ→a, số→9) để thấy hỏng chỗ nào
  // mà không lộ token thật.
  if (!token || !isValidZaloBotToken(token)) {
    return NextResponse.json(
      {
        ok: false,
        reason: token ? "bot_token_malformed" : "bot_token_not_configured",
        token_diagnosis: await describeZaloBotToken(),
      },
      { status: 400 },
    );
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
  // Zalo bắt buộc secret_token khi setWebhook → chưa có thì tự sinh và lưu lại,
  // đúng thứ /api/zalo/bot đọc ra để kiểm header X-Bot-Api-Secret-Token.
  const secret = action === "delete" ? "" : await ensureZaloBotWebhookSecret();

  const res =
    action === "delete"
      ? await zaloBotApi<Record<string, unknown>>(token, "deleteWebhook", {})
      : await zaloBotApi<Record<string, unknown>>(token, "setWebhook", { url, secret_token: secret });

  if (res.ok === false) {
    // Trả kèm error_code + url đã gửi: "Not Found" trơ trọi không chỉ ra được
    // lỗi nằm ở token hay ở địa chỉ webhook.
    return NextResponse.json(
      {
        ok: false,
        reason: res.description ?? "zalo_error",
        error_code: res.error_code ?? null,
        sent_url: url,
        token_tail: `…${token.slice(-4)}`,
      },
      { status: 400 },
    );
  }

  // Zalo tự gọi thử webhook rồi trả kết quả trong `verification` — đây là chỗ
  // duy nhất biết được vì sao bot im (endpoint 404, secret lệch, timeout…).
  const verification = (res.result as { verification?: Record<string, unknown> } | undefined)?.verification ?? null;

  // Tự gọi webhook của chính mình y như Zalo gọi. `verification` của Zalo chỉ
  // nói hỏng chứ không nói hỏng vì đâu; đối chiếu với lượt gọi này mới tách được
  // "endpoint chết" và "Zalo không tới được endpoint đang sống".
  const selfCheck = action === "set" ? await probeOwnWebhook(url, secret) : null;

  const info = await zaloBotApi<Record<string, unknown>>(token, "getWebhookInfo", {});
  const me = await zaloBotApi<{ display_name?: string; account_name?: string; id?: string }>(token, "getMe", {});

  return NextResponse.json({
    ok: true,
    action,
    webhook_url: action === "set" ? url : null,
    // Không có secret thì ai cũng giả được cập nhật gửi tới webhook.
    secret_configured: Boolean(secret),
    verification,
    self_check: selfCheck,
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
  if (!token || !isValidZaloBotToken(token)) {
    return NextResponse.json({
      ok: false,
      reason: token ? "bot_token_malformed" : "bot_token_not_configured",
      token_diagnosis: await describeZaloBotToken(),
    });
  }

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
    secret_configured: Boolean(await getZaloBotWebhookSecret()),
  });
}
