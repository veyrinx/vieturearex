import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site";
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;
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
    const miniAppUrl = `${siteUrl}/tg`;
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

  return NextResponse.json({ ok: data.ok, action, webhook_url: action === "set" ? webhookUrl : null });
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
