import "server-only";
import { getSettings } from "@/lib/data/content-service";

const APP_ID_KEY      = "integrations.lark_app_id";
const APP_SECRET_KEY  = "integrations.lark_app_secret";
const SHEET_TOKEN_KEY = "integrations.lark_sheet_token";
const SHEET_NAME_KEY  = "integrations.lark_sheet_name";

const BASE = "https://open.larksuite.com/open-apis";

async function getTenantToken(appId: string, appSecret: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tenant_access_token?: string };
    return data.tenant_access_token ?? null;
  } catch {
    return null;
  }
}

function vnTimestamp() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replace(",", "");
}

export interface LarkSheetUser {
  email: string;
  display_name?: string | null;
  role?: string;
  ff_id?: string | null;
}

/** Append 1 row vào Lark Spreadsheet khi có user mới đăng ký */
export async function appendUserToLarkSheet(user: LarkSheetUser) {
  const settings = await getSettings();
  const appId      = settings.find((s) => s.key === APP_ID_KEY)?.value?.trim() || "";
  const appSecret  = settings.find((s) => s.key === APP_SECRET_KEY)?.value?.trim() || "";
  const sheetToken = settings.find((s) => s.key === SHEET_TOKEN_KEY)?.value?.trim() || "";
  const sheetName  = settings.find((s) => s.key === SHEET_NAME_KEY)?.value?.trim() || "Sheet1";

  if (!appId || !appSecret || !sheetToken) return { ok: false, reason: "not_configured" };

  const token = await getTenantToken(appId, appSecret);
  if (!token) return { ok: false, reason: "auth_failed" };

  const row = [
    vnTimestamp(),
    user.email,
    user.display_name ?? "",
    user.role ?? "user",
    user.ff_id ?? "",
  ];

  try {
    const res = await fetch(
      `${BASE}/sheets/v2/spreadsheets/${sheetToken}/values_append`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueRange: {
            range: `${sheetName}!A:E`,
            values: [row],
          },
          insertDataOption: "INSERT_ROWS",
        }),
      },
    );
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
    console.error("[lark-sheet] append failed:", body);
    return { ok: false, reason: body.msg ?? "api_error" };
  } catch (err) {
    console.error("[lark-sheet] fetch error:", err);
    return { ok: false, reason: "fetch_error" };
  }
}
