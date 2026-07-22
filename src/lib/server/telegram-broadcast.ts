import "server-only";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/content-service";
import { untypedFrom } from "@/lib/supabase/untyped";

const TOKEN_KEY = "integrations.telegram_bot_token";

// ── Init-data validation ──────────────────────────────────────────────────────

export type TgInitUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export function validateTelegramInitData(
  initData: string,
  botToken: string,
): { valid: boolean; user?: TgInitUser } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (hash !== expectedHash) return { valid: false };

    const userJson = params.get("user");
    const user: TgInitUser | undefined = userJson
      ? (JSON.parse(userJson) as TgInitUser)
      : undefined;

    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

// ── Token helper ──────────────────────────────────────────────────────────────

async function getBotToken(): Promise<string> {
  const settings = await getSettings();
  return settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
}

// ── Subscriber CRUD ───────────────────────────────────────────────────────────

export async function subscribeUser(
  telegramUserId: number,
  firstName: string,
  username?: string,
): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;
  await untypedFrom(db, "telegram_subscribers").upsert(
    {
      telegram_user_id: telegramUserId,
      first_name: firstName,
      username: username ?? null,
      active: true,
      subscribed_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );
}

export async function unsubscribeUser(telegramUserId: number): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;
  await untypedFrom(db, "telegram_subscribers")
    .update({ active: false })
    .eq("telegram_user_id", telegramUserId);
}

export async function isSubscribed(telegramUserId: number): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;
  const { data } = (await untypedFrom(db, "telegram_subscribers")
    .select("active")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle()) as { data: { active: boolean } | null };
  return data?.active === true;
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

// Telegram giới hạn ~30 tin/giây tới các user khác nhau. Gửi theo lô để
// không dính 429, và tôn trọng retry_after khi bị chặn tốc độ.
const BROADCAST_BATCH = 25;
const BATCH_PAUSE_MS = 1_100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendOne(
  token: string,
  chatId: number,
  html: string,
): Promise<"ok" | "blocked" | "error"> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  }).catch(() => null);

  if (!res) return "error";
  if (res.ok) return "ok";

  const err = (await res.json().catch(() => ({}))) as {
    error_code?: number;
    parameters?: { retry_after?: number };
  };
  // 429 = quá tốc độ → nghỉ theo retry_after rồi thử lại đúng 1 lần.
  if (err.error_code === 429) {
    await sleep((err.parameters?.retry_after ?? 1) * 1000 + 200);
    const retry = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => null);
    return retry?.ok ? "ok" : "error";
  }
  // 403 = user chặn bot; 400 "chat not found" = tài khoản không còn hợp lệ.
  if (err.error_code === 403 || err.error_code === 400) return "blocked";
  return "error";
}

export async function broadcastToSubscribers(html: string): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;

  const token = await getBotToken();
  if (!token) return;

  const { data: subs } = (await untypedFrom(db, "telegram_subscribers")
    .select("telegram_user_id")
    .eq("active", true)) as { data: { telegram_user_id: number }[] | null };

  if (!subs?.length) return;

  const toDeactivate: number[] = [];

  for (let i = 0; i < subs.length; i += BROADCAST_BATCH) {
    const batch = subs.slice(i, i + BROADCAST_BATCH);
    const results = await Promise.all(
      batch.map((sub) => sendOne(token, sub.telegram_user_id, html)),
    );
    results.forEach((r, idx) => {
      if (r === "blocked") toDeactivate.push(batch[idx].telegram_user_id);
    });
    if (i + BROADCAST_BATCH < subs.length) await sleep(BATCH_PAUSE_MS);
  }

  if (toDeactivate.length) {
    await untypedFrom(db, "telegram_subscribers")
      .update({ active: false })
      .in("telegram_user_id", toDeactivate);
  }
}
