import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";

const TOKEN_KEY = "integrations.telegram_bot_token";

/**
 * Telegram gọi webhook mà KHÔNG đi theo chuyển hướng: đăng ký một địa chỉ trả
 * 308 là bot chết lặng — setWebhook vẫn báo thành công, chỉ getWebhookInfo mới
 * lộ lỗi. Site chạy nhiều tên miền và có lúc tên miền cũ chỉ còn trỏ sang tên
 * miền mới, nên phải thử trước khi giao cho Telegram.
 */
async function redirectsAway(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    return res.status >= 300 && res.status < 400;
  } catch {
    // Không thử được thì đừng tự ý đổi — thà giữ đúng cấu hình admin đã đặt.
    return false;
  }
}

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

  // Tên miền lấy từ NEXT_PUBLIC_SITE_URL, không có thì lấy chính nơi admin đang
  // đứng (chỗ mở được trang này chắc chắn phục vụ trực tiếp).
  const origin = new URL(request.url).origin;
  // Bỏ dấu / cuối: người đặt biến môi trường hay dán kèm, thành "…//api/…".
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/+$/, "");
  let webhookUrl = `${configured}/api/telegram/webhook`;
  let switchedFrom: string | null = null;

  // Địa chỉ đã chọn mà trả 3xx thì đổi sang tên miền admin đang đứng. Nơi admin
  // mở được trang này chắc chắn là nơi phục vụ trực tiếp.
  if (configured !== origin && (await redirectsAway(webhookUrl))) {
    switchedFrom = webhookUrl;
    webhookUrl = `${origin}/api/telegram/webhook`;
  }
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

  return NextResponse.json({
    ok: data.ok,
    action,
    webhook_url: action === "set" ? webhookUrl : null,
    // Có giá trị = địa chỉ trong NEXT_PUBLIC_SITE_URL đang bị chuyển hướng, đã
    // tự đổi. Sửa lại biến môi trường cho khớp, đừng để lệ thuộc chốt chặn này.
    ...(switchedFrom ? { switched_from: switchedFrom } : {}),
  });
}

// GET — check current webhook info
export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return NextResponse.json({ ok: false, reason: "bot_token_not_configured" });

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).catch(() => null);
  if (!res?.ok) return NextResponse.json({ ok: false, reason: "telegram_error" });

  const data = (await res.json()) as { ok: boolean; result?: unknown };
  return NextResponse.json({ ok: data.ok, info: data.result });
}
