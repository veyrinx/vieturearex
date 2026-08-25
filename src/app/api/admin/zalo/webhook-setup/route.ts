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

/** Trang chặn của Cloudflare trả 403 kèm "Just a moment..." chứ không phải JSON. */
function looksBlockedByCdn(probe: { status: number; body: string }): boolean {
  return (
    (probe.status === 403 || probe.status === 503) &&
    /just a moment|cf-browser-verification|cloudflare|attention required/i.test(probe.body)
  );
}

/** Vercel Deployment Protection: tên miền *.vercel.app đòi đăng nhập SSO. */
function looksProtectedByVercel(probe: { status: number; body: string }): boolean {
  return probe.status === 401 && /protected deployment|vercel_auth/i.test(probe.body);
}

/**
 * Tên miền chính có thể nằm sau Cloudflare với chế độ thử thách trình duyệt —
 * người dùng không thấy gì nhưng MÁY gọi vào là ăn 403 "Just a moment…", nên
 * Zalo không bao giờ giao được update. Thử lần lượt các cửa vào của site rồi
 * đăng ký cửa nào thật sự nhận được POST máy-gọi-máy.
 */
function webhookCandidates(serving: string, requestOrigin: string): string[] {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelNow = process.env.VERCEL_URL?.trim();
  const list = [
    // Khai WEBHOOK_PUBLIC_ORIGIN khi có tên miền phụ để DNS-only (mây xám) —
    // cách sạch nhất để giữ Cloudflare cho cả site mà webhook vẫn vào được.
    process.env.WEBHOOK_PUBLIC_ORIGIN?.trim().replace(/\/+$/, "") ?? "",
    serving,
    requestOrigin,
    vercelProd ? `https://${vercelProd}` : "",
    vercelNow ? `https://${vercelNow}` : "",
  ];
  return [...new Set(list.filter(Boolean))];
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
  const switchedFrom = serving === SITE_URL ? null : webhookPath(SITE_URL);
  // Zalo bắt buộc secret_token khi setWebhook → chưa có thì tự sinh và lưu lại,
  // đúng thứ /api/zalo/bot đọc ra để kiểm header X-Bot-Api-Secret-Token.
  const secret = action === "delete" ? "" : await ensureZaloBotWebhookSecret();

  // Chọn cửa vào mà máy gọi máy thật sự đi lọt, chứ không đăng ký bừa tên miền
  // chính rồi để Zalo ăn 403 của Cloudflare.
  const probes: { url: string; status: number; ms: number; redirected_to: string | null; body: string }[] = [];
  let url = webhookPath(serving);
  if (action === "set") {
    for (const origin of webhookCandidates(serving, new URL(request.url).origin)) {
      const candidate = webhookPath(origin);
      const probe = await probeOwnWebhook(candidate, secret);
      probes.push({ url: candidate, ...probe });
      if (probe.status === 200) {
        url = candidate;
        break;
      }
    }
  }
  const chosenProbe = probes.find((p) => p.url === url) ?? probes[0] ?? null;
  // Trước đây đòi MỌI cửa phải là trang chặn của Cloudflare mới báo động — chỉ
  // cần một cửa hỏng vì lý do khác (Vercel Deployment Protection) là im re.
  // Đúng ra: không cửa nào vào được, mà có cửa dính CDN, thì đó là thủ phạm.
  const noneReachable = probes.length > 0 && !probes.some((p) => p.status === 200);
  const blockedEverywhere = noneReachable && probes.some(looksBlockedByCdn);
  const vercelProtected = noneReachable && probes.some(looksProtectedByVercel);

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
  const selfCheck = chosenProbe;

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
    probes,
    // true = không cửa nào vào được và có cửa dính trang chặn của CDN.
    blocked_by_cdn: blockedEverywhere,
    // true = tên miền *.vercel.app đang bật Deployment Protection.
    protected_by_vercel: vercelProtected,
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
