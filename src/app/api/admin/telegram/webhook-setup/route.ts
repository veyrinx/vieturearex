import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";
import { SITE_URL } from "@/lib/constants/site";
import { resolveServingOrigin } from "@/lib/server/serving-origin";

const TOKEN_KEY = "integrations.telegram_bot_token";

// Register or remove the Telegram bot webhook
// POST { action: "set" | "delete" }
export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "delete" ? "delete" : "set";

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return NextResponse.json({ ok: false, reason: "bot_token_not_configured" }, { status: 400 });
  // Còn nguyên "enc:" = APP_SECRET không mở được token; gửi đi chỉ nhận 404.
  if (token.startsWith("enc:")) {
    return NextResponse.json({ ok: false, reason: "bot_token_decrypt_failed" }, { status: 400 });
  }

  // Tên miền chuẩn (SITE_URL đã tự kéo tên miền Arex cũ về tên miền chính), rồi
  // đi theo chuyển hướng để chắc chắn đăng ký đúng nơi trả 2xx. Không tới được
  // thì lấy chính nơi admin đang đứng.
  const origin = new URL(request.url).origin;
  const configured = SITE_URL;
  const serving = await resolveServingOrigin(configured, origin);
  const webhookUrl = `${serving}/api/telegram/webhook`;
  const switchedFrom = serving === configured ? null : `${configured}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";

  let tgEndpoint: string;
  let tgBody: Record<string, unknown>;

  if (action === "delete") {
    tgEndpoint = `https://api.telegram.org/bot${token}/deleteWebhook`;
    tgBody = { drop_pending_updates: true };
  } else {
    tgEndpoint = `https://api.telegram.org/bot${token}/setWebhook`;
    tgBody = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query", "my_chat_member"],
      drop_pending_updates: true,
      ...(secret ? { secret_token: secret } : {}),
    };
  }

  const res = await fetch(tgEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tgBody),
  }).catch(() => null);

  if (!res?.ok) {
    const err = (await res?.json().catch(() => ({}))) as { description?: string };
    return NextResponse.json({ ok: false, reason: err.description ?? "telegram_error" }, { status: 400 });
  }

  const data = (await res.json()) as { ok: boolean; description?: string };

  // Khi bật webhook: đăng ký thêm menu lệnh cố định + nút Menu mở Mini App (best-effort).
  if (action === "set" && data.ok) {
    // Cùng gốc với webhook đã chốt ở trên — Mini App mở qua tên miền chuyển
    // hướng thì Telegram báo lỗi tên miền không khớp với bot.
    const miniAppUrl = `${new URL(webhookUrl).origin}/tg`;
    const api = (method: string, payload: Record<string, unknown>) =>
      fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

    await Promise.all([
      api("setMyCommands", {
        commands: [
          { command: "start", description: "Mở Arex Mini App" },
          { command: "lienket", description: "Liên kết tài khoản Arex" },
          { command: "hoso", description: "Hồ sơ, điểm & chuỗi điểm danh" },
          { command: "diemdanh", description: "Điểm danh nhận điểm" },
          { command: "nap", description: "Cửa hàng Prime trong game" },
          { command: "news", description: "Tin tức mới nhất" },
          { command: "events", description: "Sự kiện đang diễn ra" },
          { command: "giaidau", description: "Giải đấu & bracket" },
          { command: "bxh", description: "Bảng xếp hạng" },
          { command: "quiz", description: "Quiz đố vui" },
          { command: "vukhi", description: "Wiki vũ khí" },
          { command: "help", description: "Danh sách lệnh" },
        ],
      }),
      api("setChatMenuButton", {
        menu_button: { type: "web_app", text: "Mini App", web_app: { url: miniAppUrl } },
      }),
    ]);
  }

  // Hỏi lại Telegram xem nó thấy gì: setWebhook báo ok vẫn có thể kèm lỗi giao
  // hàng của lần trước (sai chứng chỉ, 404, timeout). Trả luôn cho admin thay vì
  // để họ tưởng xong việc.
  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    .then((r) => r.json())
    .then((j) => (j as { result?: Record<string, unknown> }).result ?? null)
    .catch(() => null);

  return NextResponse.json({
    ok: data.ok,
    action,
    webhook_url: action === "set" ? webhookUrl : null,
    // Không có secret thì bất kỳ ai cũng giả được cập nhật Telegram gửi tới.
    secret_configured: Boolean(secret),
    info,
    // Có giá trị = địa chỉ trong NEXT_PUBLIC_SITE_URL đang bị chuyển hướng, đã
    // tự đổi. Sửa lại biến môi trường cho khớp, đừng để lệ thuộc chốt chặn này.
    ...(switchedFrom ? { switched_from: switchedFrom } : {}),
  });
}

// GET — check current webhook info
export async function GET(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return NextResponse.json({ ok: false, reason: "bot_token_not_configured" });
  // Token mã hoá bằng APP_SECRET khác lúc lưu thì getSettings trả lại nguyên
  // chuỗi "enc:…" — gọi Telegram sẽ 404 khó hiểu, nói thẳng ra cho nhanh.
  if (token.startsWith("enc:")) {
    return NextResponse.json({ ok: false, reason: "bot_token_decrypt_failed" });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).catch(() => null);
  if (!res?.ok) return NextResponse.json({ ok: false, reason: "telegram_error" });

  const data = (await res.json()) as { ok: boolean; result?: { url?: string } };
  const origin = new URL(request.url).origin;
  const expected = `${await resolveServingOrigin(SITE_URL, origin)}/api/telegram/webhook`;
  const current = data.result?.url ?? "";
  return NextResponse.json({
    ok: data.ok,
    info: data.result,
    expected_url: expected,
    // false = webhook đang trỏ sai chỗ (tên miền cũ / bản deploy khác) → bấm
    // "Đăng ký webhook" lại là xong.
    url_matches: current === expected,
    secret_configured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET),
  });
}
