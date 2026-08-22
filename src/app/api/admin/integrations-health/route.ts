import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";
import { verifySmtp } from "@/lib/server/email";
import { SITE_URL, siteConfig } from "@/lib/constants/site";
import { resolveServingOrigin } from "@/lib/server/serving-origin";

/**
 * Một cú gọi, ra hết trạng thái các đường liên lạc ra ngoài: email có gửi được
 * không, webhook Telegram có trỏ đúng chỗ không, Discord còn sống không.
 *
 * Sinh ra vì mấy thứ này hỏng đều hỏng lặng lẽ: setWebhook trỏ vào tên miền
 * đang 308 thì Telegram vẫn báo ok; APP_SECRET lệch thì token thành chuỗi
 * "enc:…" rồi mọi cú gọi trả 404; SMTP sai mật khẩu thì email chỉ trượt vào log.
 * Không ai đi soi cho tới lúc người dùng kêu.
 *
 * KHÔNG gửi thư/tin nhắn thật — chỉ bắt tay rồi hỏi trạng thái. Muốn gửi thật
 * thì dùng /api/admin/mail/test và /api/admin/telegram/test.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
};

const TG_TOKEN = "integrations.telegram_bot_token";
const TG_USER_TOKEN = "integrations.telegram_user_bot_token";
const TG_CHAT = "integrations.telegram_chat_id";
const DISCORD_INTERNAL = "integrations.discord_internal_webhook";
const DISCORD_PUBLIC = "integrations.discord_public_webhook";

/** Giá trị còn tiền tố "enc:" nghĩa là APP_SECRET không mở được nó. */
const undecrypted = (v: string) => v.startsWith("enc:");

async function tg(token: string, method: string): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, { signal: AbortSignal.timeout(10_000) })
    .then((r) => r.json() as Promise<{ ok: boolean; result?: unknown; description?: string }>)
    .catch((e) => ({ ok: false, description: String(e) }));
}

export async function GET(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const settings = await getSettings();
  const get = (key: string) => settings.find((s) => s.key === key)?.value?.trim() ?? "";
  const checks: Check[] = [];

  // ── Giải mã cài đặt ───────────────────────────────────────────────────────
  // Đặt đầu tiên vì nó giải thích luôn mọi mục đỏ bên dưới: một khi APP_SECRET
  // lệch thì token Telegram, webhook Discord, mật khẩu SMTP… đều thành chuỗi
  // "enc:…" và mọi tích hợp chết cùng lúc.
  const locked = settings.filter((s) => undecrypted(s.value?.trim() ?? "")).map((s) => s.key);
  checks.push({
    name: "Giải mã cài đặt",
    ok: locked.length === 0,
    detail:
      locked.length === 0
        ? "Mọi giá trị nhạy cảm đều mở được"
        : `${locked.length} giá trị không mở được: ${locked.join(", ")}`,
    fix:
      locked.length === 0
        ? undefined
        : "APP_SECRET trên Vercel khác lúc lưu. Đặt lại đúng APP_SECRET cũ rồi redeploy; "
          + "nếu mất hẳn thì vào Admin → Cài đặt nhập lại từng giá trị trên (chúng sẽ được mã hoá lại bằng khoá hiện tại).",
  });

  // ── Tên miền ──────────────────────────────────────────────────────────────
  const origin = new URL(request.url).origin;
  const serving = await resolveServingOrigin(SITE_URL, origin);
  checks.push({
    name: "Tên miền",
    ok: serving === SITE_URL,
    detail:
      serving === SITE_URL
        ? `${SITE_URL} phục vụ trực tiếp`
        : `${SITE_URL} đang chuyển hướng sang ${serving}`,
    fix:
      serving === SITE_URL
        ? undefined
        : `Sửa siteConfig.url trong src/lib/constants/site.ts thành ${serving}, hoặc đổi Primary Domain trên Vercel. Tên miền chuyển hướng làm chết mọi webhook.`,
  });

  // ── Email ─────────────────────────────────────────────────────────────────
  const smtp = await verifySmtp();
  checks.push({
    name: "Email (SMTP)",
    ok: smtp.ok,
    detail: !smtp.configured
      ? "Chưa cấu hình"
      : smtp.ok
        ? `Đăng nhập được ${smtp.host}:${smtp.port}, gửi từ ${smtp.from}`
        : `${smtp.host}:${smtp.port} — ${smtp.error}`,
    fix: !smtp.configured
      ? "Admin → Cài đặt → Email: điền SMTP, hoặc đặt GMAIL_USER + GMAIL_APP_PASSWORD."
      : smtp.ok
        ? undefined
        : "Kiểm tra mật khẩu ứng dụng và cổng (465 = SSL, 587 = STARTTLS).",
  });

  // ── Telegram bot admin + webhook ──────────────────────────────────────────
  const adminToken = get(TG_TOKEN);
  if (!adminToken) {
    checks.push({ name: "Telegram (bot admin)", ok: false, detail: "Chưa cấu hình token" });
  } else if (undecrypted(adminToken)) {
    checks.push({
      name: "Telegram (bot admin)",
      ok: false,
      detail: "Token trong DB không giải mã được",
      fix: "APP_SECRET khác lúc lưu. Đặt lại đúng APP_SECRET trên Vercel, hoặc nhập lại token trong Cài đặt.",
    });
  } else {
    const me = await tg(adminToken, "getMe");
    const meResult = me.result as { username?: string } | undefined;
    checks.push({
      name: "Telegram (bot admin)",
      ok: me.ok,
      detail: me.ok ? `@${meResult?.username ?? "?"}` : (me.description ?? "Telegram từ chối token"),
    });

    if (me.ok) {
      const info = await tg(adminToken, "getWebhookInfo");
      const wh = (info.result ?? {}) as {
        url?: string;
        pending_update_count?: number;
        last_error_message?: string;
        last_error_date?: number;
      };
      const expected = `${serving}/api/telegram/webhook`;
      const matches = wh.url === expected;
      const lastError = wh.last_error_message
        ? ` — lỗi gần nhất: ${wh.last_error_message}`
        : "";
      checks.push({
        name: "Telegram webhook",
        ok: matches && !wh.last_error_message,
        detail: !wh.url
          ? "Chưa đăng ký webhook"
          : `${wh.url}${matches ? "" : ` (đáng lẽ phải là ${expected})`}, đang chờ ${wh.pending_update_count ?? 0} cập nhật${lastError}`,
        fix: matches && !wh.last_error_message ? undefined : "Admin → Telegram → bấm Đăng ký webhook.",
      });
      checks.push({
        name: "Telegram webhook secret",
        ok: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET),
        detail: process.env.TELEGRAM_WEBHOOK_SECRET
          ? "Đã đặt TELEGRAM_WEBHOOK_SECRET"
          : process.env.CRON_SECRET
            ? "Đang dùng tạm CRON_SECRET"
            : "Không có — ai cũng giả được cập nhật gửi tới webhook",
        fix: process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET
          ? undefined
          : "Đặt TELEGRAM_WEBHOOK_SECRET trên Vercel rồi đăng ký lại webhook.",
      });
    }
  }

  // ── Telegram bot user ─────────────────────────────────────────────────────
  const userToken = get(TG_USER_TOKEN);
  if (userToken) {
    if (undecrypted(userToken)) {
      checks.push({ name: "Telegram (bot user)", ok: false, detail: "Token không giải mã được" });
    } else {
      const me = await tg(userToken, "getMe");
      const meResult = me.result as { username?: string } | undefined;
      checks.push({
        name: "Telegram (bot user)",
        ok: me.ok,
        detail: me.ok ? `@${meResult?.username ?? "?"}` : (me.description ?? "Telegram từ chối token"),
      });
    }
  }

  const chatId = get(TG_CHAT);
  if (chatId && undecrypted(chatId)) {
    checks.push({ name: "Telegram chat nội bộ", ok: false, detail: "chat_id không giải mã được" });
  }

  // ── Discord ───────────────────────────────────────────────────────────────
  for (const [label, key] of [
    ["Discord (nội bộ)", DISCORD_INTERNAL],
    ["Discord (public)", DISCORD_PUBLIC],
  ] as const) {
    const hook = get(key);
    if (!hook) continue;
    if (undecrypted(hook)) {
      checks.push({ name: label, ok: false, detail: "Webhook không giải mã được" });
      continue;
    }
    // GET một webhook URL trả về mô tả webhook — không gửi tin nào cả.
    const res = await fetch(hook, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    checks.push({
      name: label,
      ok: Boolean(res?.ok),
      detail: res?.ok ? "Webhook còn sống" : `Discord trả ${res?.status ?? "không kết nối được"}`,
      fix: res?.ok ? undefined : "Webhook đã bị xoá ở Discord — tạo lại rồi dán vào Cài đặt.",
    });
  }

  return NextResponse.json(
    {
      site_url: SITE_URL,
      canonical: siteConfig.url,
      serving_origin: serving,
      checked_at: new Date().toISOString(),
      ok: checks.every((c) => c.ok),
      checks,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
