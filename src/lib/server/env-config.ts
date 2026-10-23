/**
 * Biến môi trường lưu trong DB (bảng app_env — supabase/migration-app-env.sql).
 *
 * Trên Vercel chỉ cần cấu hình Supabase. Mọi biến trong DB_ENV_GROUPS được nạp
 * vào process.env lúc máy chủ khởi động (src/instrumentation.ts), nên code cũ
 * đọc process.env.X vẫn chạy nguyên, không phải sửa từng chỗ.
 *
 * Thứ tự ưu tiên: biến đặt trên Vercel/.env > giá trị trong DB. Bản production
 * khởi động lần đầu chép các biến đang có trên Vercel vào DB, nên sau đó xoá
 * chúng khỏi Vercel là xong — giá trị trong DB tiếp quản, không đổi gì.
 *
 * KHÔNG đưa vào đây:
 *   • Supabase (URL, anon/service key) — cần nó mới đọc được DB.
 *   • NEXT_PUBLIC_* — Next nhúng thẳng vào bundle lúc build.
 *   • CRON_SECRET — Vercel Cron chỉ gửi header Authorization khi biến này đặt
 *     trên Vercel; chuyển vào DB thì mọi cron nhận 401.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TABLE = "app_env";

export const DB_ENV_GROUPS: Array<{ title: string; names: string[] }> = [
  {
    title: "Bảo mật",
    names: ["APP_SECRET", "SHOP_SECRET_KEY", "HUB_SSO_SECRET", "BOT_API_SECRET", "TELEGRAM_WEBHOOK_SECRET"],
  },
  { title: "Email", names: ["GMAIL_USER", "GMAIL_APP_PASSWORD"] },
  { title: "AI & API", names: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "YOUTUBE_API_KEY", "SUPABASE_ACCESS_TOKEN"] },
  { title: "Web push & Firebase", names: ["VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] },
  {
    title: "Zalo",
    names: [
      "ZALO_OA_ACCESS_TOKEN", "ZALO_WEBHOOK_SECRET", "ZALO_MINIAPP_APP_SECRET",
      "ZALO_BOT_TOKEN", "ZALO_BOT_CHAT_ID", "ZALO_BOT_WEBHOOK_SECRET", "ZALO_BOT_LINK", "ZALO_BOT_API_BASE",
    ],
  },
  {
    title: "Discord",
    names: [
      "DISCORD_APP_ID", "DISCORD_BOT_TOKEN", "DISCORD_PUBLIC_KEY", "DISCORD_GUILD_ID",
      "DISCORD_SHOP_CHANNEL_ID", "DISCORD_STAFF_CHANNEL_ID", "DISCORD_TICKET_CHANNEL_ID", "DISCORD_EVENT_CHANNEL_ID",
      "DISCORD_AGENT_ROLE_ID", "DISCORD_LINKED_ROLE_ID", "DISCORD_SELLER_ROLE_ID", "DISCORD_STAFF_ROLE_ID",
    ],
  },
  {
    title: "Free Fire & dịch vụ ngoài",
    names: [
      "HLFF_API_KEY", "HLFF_USER_UID", "HLFF_REGION", "FF_INFO_API_URL", "FF_INFO_REGION",
      "GOOGLE_APPS_SCRIPT_URL", "WISHLIST_API_ORIGIN", "WISHLIST_API_BASE", "PRIME_STORE_API_URL",
    ],
  },
  {
    title: "Site & app",
    names: [
      "AREX_SITE_URL", "WEBHOOK_PUBLIC_ORIGIN", "ADMIN_EMAIL_DOMAIN", "SHOP_STALE_REPING_HOURS",
      "IOS_APP_TEAM_ID", "IOS_APP_BUNDLE_ID", "ANDROID_APP_PACKAGE", "ANDROID_APP_SHA256_FINGERPRINTS",
    ],
  },
];

const DB_ENV_NAMES = new Set(DB_ENV_GROUPS.flatMap((g) => g.names));

export function isDbEnvName(name: string): boolean {
  return DB_ENV_NAMES.has(name);
}

// Biến nào đặt sẵn trên Vercel/.env — ghi nhận MỘT lần trước khi nạp từ DB, vì
// sau đó process.env lẫn cả giá trị từ DB, không phân biệt được nữa. Để trên
// globalThis vì instrumentation và route handler có thể nạp module này thành
// hai bản riêng.
const g = globalThis as { __arexEnvFromHost?: Set<string> };

function hostEnvNames(): Set<string> {
  g.__arexEnvFromHost ??= new Set([...DB_ENV_NAMES].filter((n) => process.env[n]));
  return g.__arexEnvFromHost;
}

export function envAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Gọi một lần lúc máy chủ khởi động. Lỗi DB không được chặn khởi động. */
export async function hydrateEnvFromDb(): Promise<void> {
  const fromHost = hostEnvNames();
  const client = envAdminClient();
  if (!client) return;

  const { data, error } = await client
    .from(TABLE)
    .select("name, value")
    .abortSignal(AbortSignal.timeout(5000));
  if (error) {
    console.warn(`[env] Không đọc được bảng ${TABLE} — đã chạy migration-app-env.sql chưa? ${error.message}`);
    return;
  }

  const stored = new Map((data ?? []).map((r: { name: string; value: string }) => [r.name, r.value]));
  for (const [name, value] of stored) {
    if (DB_ENV_NAMES.has(name) && value && !fromHost.has(name)) process.env[name] = value;
  }

  // Chỉ production mới được chép lên DB: máy dev chạy trước mà chép .env của nó
  // lên thì production sẽ lấy nhầm khoá dev khi xoá biến khỏi Vercel.
  if (process.env.VERCEL_ENV !== "production") return;
  const missing = [...fromHost]
    .filter((n) => !stored.get(n))
    .map((n) => ({ name: n, value: process.env[n] as string }));
  if (missing.length === 0) return;
  const { error: seedErr } = await client.from(TABLE).upsert(missing, { onConflict: "name", ignoreDuplicates: true });
  if (seedErr) console.warn(`[env] Không chép được biến Vercel vào DB: ${seedErr.message}`);
}

export type DbEnvStatus = { name: string; inDb: boolean; onHost: boolean };

export async function listDbEnvStatus(client: SupabaseClient): Promise<DbEnvStatus[]> {
  const { data, error } = await client.from(TABLE).select("name, value");
  if (error) throw new Error(error.message);
  const inDb = new Set((data ?? []).filter((r: { value: string }) => r.value).map((r: { name: string }) => r.name));
  const fromHost = hostEnvNames();
  return [...DB_ENV_NAMES].map((name) => ({ name, inDb: inDb.has(name), onHost: fromHost.has(name) }));
}

/**
 * Ghi (value rỗng = xoá) rồi áp luôn cho máy chủ đang chạy. Các máy chủ khác
 * nhận giá trị mới ở lần khởi động sau (redeploy, hoặc khi Vercel thay máy).
 */
export async function setDbEnv(client: SupabaseClient, name: string, value: string): Promise<void> {
  const { error } = value
    ? await client.from(TABLE).upsert({ name, value, updated_at: new Date().toISOString() }, { onConflict: "name" })
    : await client.from(TABLE).delete().eq("name", name);
  if (error) throw new Error(error.message);
  if (hostEnvNames().has(name)) return;
  if (value) process.env[name] = value;
  else delete process.env[name];
}
