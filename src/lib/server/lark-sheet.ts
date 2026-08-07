import "server-only";
import { waitUntil } from "@vercel/functions";
import { getSettings } from "@/lib/data/content-service";

const APP_ID_KEY      = "integrations.lark_app_id";
const APP_SECRET_KEY  = "integrations.lark_app_secret";
const SHEET_TOKEN_KEY = "integrations.lark_sheet_token";
const SHEET_NAME_KEY  = "integrations.lark_sheet_name";

const BASE = "https://open.larksuite.com/open-apis";

// ── Cấu hình các tab (sheet) trong bảng tính ───────────────────────────────
// Mỗi loại sự kiện ghi vào một tab riêng. Tab nào chưa có sẽ được tự tạo kèm
// dòng tiêu đề ở lần ghi đầu tiên — admin không phải dựng bảng bằng tay.

export type SheetKey = "dang_ky" | "dang_nhap" | "don_cho" | "giai_dau" | "team";

interface SheetDef {
  title: string;
  header: string[];
}

const SHEETS: Record<SheetKey, SheetDef> = {
  dang_ky: {
    title: "Đăng ký",
    header: [
      "Thời gian", "Email", "Tên hiển thị", "User ID", "Vai trò",
      "Hình thức", "Thành viên số", "FF ID", "IP", "Thiết bị", "Trình duyệt",
    ],
  },
  dang_nhap: {
    title: "Đăng nhập",
    header: [
      "Thời gian", "Email", "Tên hiển thị", "User ID",
      "Phương thức", "IP", "Thiết bị", "Trình duyệt",
    ],
  },
  don_cho: {
    title: "Đơn chợ",
    header: [
      "Thời gian", "Sự kiện", "Mã đơn", "Trạng thái", "Tin đăng",
      "Giá (đ)", "Phí (đ)", "Người bán thực nhận (đ)",
      "Người mua", "SĐT mua", "Liên hệ mua", "Ngân hàng mua",
      "Người bán ID", "Giao dịch viên ID", "Ghi chú", "Đơn ID",
    ],
  },
  giai_dau: {
    title: "Đăng ký giải",
    header: [
      "Thời gian", "Tên giải", "Thể thức", "Ngày dự kiến", "Số đội tối đa",
      "Giải thưởng", "Người liên hệ", "Discord", "Email", "Ghi chú",
    ],
  },
  team: {
    title: "Gia nhập team",
    header: [
      "Thời gian", "Email", "Tên hiển thị", "User ID", "SĐT",
      "Vị trí ứng tuyển", "Lời nhắn", "Tài khoản game",
      "Facebook", "Instagram", "TikTok", "Discord", "Zalo",
      "Mã mời", "Nhãn mời", "IP", "Thiết bị", "Trình duyệt",
    ],
  },
};

// ── Xác thực ───────────────────────────────────────────────────────────────

interface LarkConfig {
  appId: string;
  appSecret: string;
  sheetToken: string;
  /** Tab ghi đăng ký — giữ lại setting cũ để cấu hình sẵn có không vỡ. */
  legacyRegisterTab: string;
}

async function readConfig(): Promise<LarkConfig | null> {
  const settings = await getSettings();
  const pick = (key: string) => settings.find((s) => s.key === key)?.value?.trim() || "";

  const appId      = pick(APP_ID_KEY);
  const appSecret  = pick(APP_SECRET_KEY);
  const sheetToken = pick(SHEET_TOKEN_KEY);
  if (!appId || !appSecret || !sheetToken) return null;

  return { appId, appSecret, sheetToken, legacyRegisterTab: pick(SHEET_NAME_KEY) };
}

let tokenCache: { value: string; expiresAt: number } | null = null;

async function getTenantToken(appId: string, appSecret: string): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;
  try {
    const res = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tenant_access_token?: string; expire?: number };
    if (!data.tenant_access_token) return null;
    // Lark trả expire (giây); trừ hao 60s để không dùng token sát hạn.
    const ttl = Math.max(60, (data.expire ?? 7200) - 60) * 1000;
    tokenCache = { value: data.tenant_access_token, expiresAt: Date.now() + ttl };
    return tokenCache.value;
  } catch {
    return null;
  }
}

// ── Giải/tạo tab ───────────────────────────────────────────────────────────

/** sheetToken:title → sheetId. Cache trong RAM của instance, mất là dựng lại. */
const sheetIdCache = new Map<string, string>();

interface MetaSheet { sheetId: string; title: string; rowCount?: number }

async function listSheets(token: string, sheetToken: string): Promise<MetaSheet[]> {
  const res = await fetch(`${BASE}/sheets/v2/spreadsheets/${sheetToken}/metainfo`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data?: { sheets?: MetaSheet[] } };
  return body.data?.sheets ?? [];
}

async function createSheet(token: string, sheetToken: string, title: string): Promise<string | null> {
  const res = await fetch(`${BASE}/sheets/v2/spreadsheets/${sheetToken}/sheets_batch_update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: { replies?: Array<{ addSheet?: { properties?: { sheetId?: string } } }> };
  };
  return body.data?.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

async function appendValues(
  token: string,
  sheetToken: string,
  sheetId: string,
  values: string[][],
): Promise<boolean> {
  const res = await fetch(`${BASE}/sheets/v2/spreadsheets/${sheetToken}/values_append`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      valueRange: { range: `${sheetId}!A:Z`, values },
      insertDataOption: "INSERT_ROWS",
    }),
  });
  if (res.ok) return true;
  const body = (await res.json().catch(() => ({}))) as { msg?: string };
  console.error("[lark-sheet] append failed:", body.msg ?? res.status);
  return false;
}

/**
 * Trả sheetId của tab `title`, tạo mới + ghi dòng tiêu đề nếu chưa có.
 * `title` cũng chấp nhận chính sheetId (cấu hình cũ nhập ID thay vì tên).
 */
async function ensureSheet(
  token: string,
  sheetToken: string,
  title: string,
  header: string[],
): Promise<string | null> {
  const cacheKey = `${sheetToken}:${title}`;
  const cached = sheetIdCache.get(cacheKey);
  if (cached) return cached;

  const sheets = await listSheets(token, sheetToken);
  const found = sheets.find((s) => s.title === title || s.sheetId === title);
  if (found) {
    sheetIdCache.set(cacheKey, found.sheetId);
    // Bảng rỗng (tab do người dùng tự tạo) thì bù dòng tiêu đề.
    if (!found.rowCount) await appendValues(token, sheetToken, found.sheetId, [header]);
    return found.sheetId;
  }

  const created = await createSheet(token, sheetToken, title);
  if (!created) return null;
  sheetIdCache.set(cacheKey, created);
  await appendValues(token, sheetToken, created, [header]);
  return created;
}

// ── Ghi 1 dòng ─────────────────────────────────────────────────────────────

export interface AppendResult { ok: boolean; reason?: string }

async function appendRow(key: SheetKey, cells: Array<string | number | null | undefined>): Promise<AppendResult> {
  const config = await readConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const token = await getTenantToken(config.appId, config.appSecret);
  if (!token) return { ok: false, reason: "auth_failed" };

  const def = SHEETS[key];
  // Tab đăng ký vẫn tôn trọng setting "Tên Sheet" cũ nếu admin đã điền.
  const title = key === "dang_ky" && config.legacyRegisterTab ? config.legacyRegisterTab : def.title;

  const sheetId = await ensureSheet(token, config.sheetToken, title, def.header);
  if (!sheetId) return { ok: false, reason: "sheet_unavailable" };

  // Cắt/đệm cho khớp số cột tiêu đề — lệch cột là bảng hỏng.
  const row = def.header.map((_, i) => {
    const v = cells[i];
    if (v === null || v === undefined || v === "") return "—";
    return typeof v === "number" ? v.toLocaleString("vi-VN") : String(v);
  });

  const ok = await appendValues(token, config.sheetToken, sheetId, [row]);
  return ok ? { ok: true } : { ok: false, reason: "api_error" };
}

/**
 * Ghi nhưng không bao giờ ném lỗi ra ngoài — sheet hỏng không được chặn nghiệp vụ.
 *
 * Caller `void` lời gọi này để không bắt người dùng đợi Lark, nhưng response trả
 * xong là Vercel có quyền dừng function giữa chừng. `waitUntil` giữ function sống
 * tới khi ghi xong. Ngoài môi trường Vercel (dev, self-host) nó là no-op:
 * `getContext()` trả `{}` nên `waitUntil?.()` không làm gì.
 */
function safeAppend(key: SheetKey, cells: Array<string | number | null | undefined>) {
  const task = appendRow(key, cells).catch((err) => {
    console.error(`[lark-sheet] ${key}:`, err);
    return { ok: false, reason: "fetch_error" } as AppendResult;
  });
  waitUntil(task);
  return task;
}

function vnTimestamp() {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date()).replace(",", "");
}

// ── API theo từng loại sự kiện ─────────────────────────────────────────────

export interface LarkSheetUser {
  email: string;
  display_name?: string | null;
  user_id?: string | null;
  role?: string;
  /** Đăng ký công khai, mời vào team, Google, Zalo… */
  source?: string;
  member_no?: number | null;
  ff_id?: string | null;
  ip?: string | null;
  device?: string | null;
  browser?: string | null;
}

/** Append 1 dòng khi có user mới đăng ký */
export function appendUserToLarkSheet(user: LarkSheetUser) {
  return safeAppend("dang_ky", [
    vnTimestamp(),
    user.email,
    user.display_name,
    user.user_id,
    user.role ?? "user",
    user.source ?? "Đăng ký công khai",
    user.member_no != null ? `#${user.member_no.toLocaleString("vi-VN")}` : null,
    user.ff_id,
    user.ip,
    user.device,
    user.browser,
  ]);
}

export interface LarkSheetLogin {
  email: string;
  display_name?: string | null;
  user_id?: string | null;
  method: string;
  ip?: string | null;
  device?: string | null;
  browser?: string | null;
}

/** Append 1 dòng mỗi lượt đăng nhập thành công */
export function appendLoginToLarkSheet(login: LarkSheetLogin) {
  return safeAppend("dang_nhap", [
    vnTimestamp(),
    login.email,
    login.display_name,
    login.user_id,
    login.method,
    login.ip,
    login.device,
    login.browser,
  ]);
}

export interface LarkSheetOrder {
  /** "Tạo đơn", "Xác nhận thanh toán", "Huỷ đơn"… */
  event: string;
  code: string;
  status: string;
  listing_title?: string | null;
  amount?: number | null;
  fee?: number | null;
  payout_amount?: number | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_contact?: string | null;
  buyer_bank?: string | null;
  seller_id?: string | null;
  agent_id?: string | null;
  note?: string | null;
  order_id?: string | null;
}

/** Append 1 dòng mỗi lần đơn chợ đổi trạng thái (tạo, thanh toán, bàn giao, huỷ…) */
export function appendOrderToLarkSheet(order: LarkSheetOrder) {
  return safeAppend("don_cho", [
    vnTimestamp(),
    order.event,
    order.code,
    order.status,
    order.listing_title,
    order.amount,
    order.fee,
    order.payout_amount,
    order.buyer_name,
    order.buyer_phone,
    order.buyer_contact,
    order.buyer_bank,
    order.seller_id,
    order.agent_id,
    order.note,
    order.order_id,
  ]);
}

export interface LarkSheetTournamentRequest {
  name: string;
  format: string;
  estimated_date?: string | null;
  max_teams?: number | null;
  prize_pool?: string | null;
  contact_name: string;
  contact_discord?: string | null;
  contact_email: string;
  notes?: string | null;
}

/** Append 1 dòng mỗi yêu cầu tổ chức/đăng ký giải */
export function appendTournamentRequestToLarkSheet(req: LarkSheetTournamentRequest) {
  return safeAppend("giai_dau", [
    vnTimestamp(),
    req.name,
    req.format,
    req.estimated_date,
    req.max_teams,
    req.prize_pool,
    req.contact_name,
    req.contact_discord,
    req.contact_email,
    req.notes,
  ]);
}

export interface LarkSheetTeamJoin {
  email: string;
  display_name?: string | null;
  user_id?: string | null;
  phone?: string | null;
  applied_role?: string | null;
  application_note?: string | null;
  /** Đã gộp thành chuỗi: "Free Fire: 123 (Nick) | Valorant: 456" */
  game_profiles?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  discord_url?: string | null;
  zalo_url?: string | null;
  invite_token?: string | null;
  invite_label?: string | null;
  ip?: string | null;
  device?: string | null;
  browser?: string | null;
}

/** Append 1 dòng mỗi lượt dùng mã mời vào team */
export function appendTeamJoinToLarkSheet(join: LarkSheetTeamJoin) {
  return safeAppend("team", [
    vnTimestamp(),
    join.email,
    join.display_name,
    join.user_id,
    join.phone,
    join.applied_role,
    join.application_note,
    join.game_profiles,
    join.facebook_url,
    join.instagram_url,
    join.tiktok_url,
    join.discord_url,
    join.zalo_url,
    join.invite_token,
    join.invite_label,
    join.ip,
    join.device,
    join.browser,
  ]);
}
