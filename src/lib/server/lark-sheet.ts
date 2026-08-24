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

/**
 * Kiểu cột — quyết định cả cách ghi giá trị lẫn cách trình bày.
 *
 * `money`/`number` ghi xuống dưới dạng SỐ THẬT chứ không phải chuỗi đã format:
 * ghi "1.500.000" thì bảng tính coi là chữ, không cộng, không lọc, không vẽ
 * biểu đồ được. Dấu phân cách để bảng tính tự lo qua formatter.
 */
type ColType = "text" | "number" | "money";

interface Column {
  label: string;
  /** Độ rộng cột (px). Đặt tay vì Lark không tự co giãn theo nội dung. */
  width: number;
  type?: ColType;
}

interface SheetDef {
  title: string;
  columns: Column[];
}

const SHEETS: Record<SheetKey, SheetDef> = {
  dang_ky: {
    title: "Đăng ký",
    columns: [
      { label: "Thời gian",     width: 155 },
      { label: "Email",         width: 210 },
      { label: "Tên hiển thị",  width: 160 },
      { label: "User ID",       width: 230 },
      { label: "Vai trò",       width: 95 },
      { label: "Hình thức",     width: 150 },
      { label: "Thành viên số", width: 110 },
      { label: "FF ID",         width: 110 },
      { label: "IP",            width: 130 },
      { label: "Thiết bị",      width: 130 },
      { label: "Trình duyệt",   width: 130 },
    ],
  },
  dang_nhap: {
    title: "Đăng nhập",
    columns: [
      { label: "Thời gian",    width: 155 },
      { label: "Email",        width: 210 },
      { label: "Tên hiển thị", width: 160 },
      { label: "User ID",      width: 230 },
      { label: "Phương thức",  width: 130 },
      { label: "IP",           width: 130 },
      { label: "Thiết bị",     width: 130 },
      { label: "Trình duyệt",  width: 130 },
    ],
  },
  don_cho: {
    title: "Đơn chợ",
    columns: [
      { label: "Thời gian",              width: 155 },
      { label: "Sự kiện",                width: 150 },
      { label: "Mã đơn",                 width: 130 },
      { label: "Trạng thái",             width: 130 },
      { label: "Tin đăng",               width: 250 },
      { label: "Giá (đ)",                width: 125, type: "money" },
      { label: "Phí (đ)",                width: 110, type: "money" },
      { label: "Người bán thực nhận (đ)", width: 165, type: "money" },
      { label: "Người mua",              width: 160 },
      { label: "SĐT mua",                width: 125 },
      { label: "Liên hệ mua",            width: 170 },
      { label: "Ngân hàng mua",          width: 190 },
      { label: "Người bán ID",           width: 230 },
      { label: "Giao dịch viên ID",      width: 230 },
      { label: "Ghi chú",                width: 250 },
      { label: "Đơn ID",                 width: 230 },
    ],
  },
  giai_dau: {
    title: "Đăng ký giải",
    columns: [
      { label: "Thời gian",     width: 155 },
      { label: "Tên giải",      width: 210 },
      { label: "Thể thức",      width: 130 },
      { label: "Ngày dự kiến",  width: 130 },
      { label: "Số đội tối đa", width: 110, type: "number" },
      { label: "Giải thưởng",   width: 170 },
      { label: "Người liên hệ", width: 160 },
      { label: "Discord",       width: 150 },
      { label: "Email",         width: 210 },
      { label: "Ghi chú",       width: 250 },
    ],
  },
  team: {
    title: "Gia nhập team",
    columns: [
      { label: "Thời gian",       width: 155 },
      { label: "Email",           width: 210 },
      { label: "Tên hiển thị",    width: 160 },
      { label: "User ID",         width: 230 },
      { label: "SĐT",             width: 125 },
      { label: "Vị trí ứng tuyển", width: 150 },
      { label: "Lời nhắn",        width: 270 },
      { label: "Tài khoản game",  width: 250 },
      { label: "Facebook",        width: 190 },
      { label: "Instagram",       width: 190 },
      { label: "TikTok",          width: 190 },
      { label: "Discord",         width: 150 },
      { label: "Zalo",            width: 150 },
      { label: "Mã mời",          width: 140 },
      { label: "Nhãn mời",        width: 150 },
      { label: "IP",              width: 130 },
      { label: "Thiết bị",        width: 130 },
      { label: "Trình duyệt",     width: 130 },
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
  values: Array<Array<string | number>>,
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

// ── Tạo dáng bảng ──────────────────────────────────────────────────────────
// Chạy đúng một lần cho mỗi tab, ngay sau khi tab được tạo (hoặc khi bù dòng
// tiêu đề cho tab rỗng). Toàn bộ nhóm này là trang trí: hỏng thì ghi log rồi
// đi tiếp, KHÔNG được kéo theo việc ghi dữ liệu.

/** 0 → "A", 25 → "Z", 26 → "AA". */
function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

async function larkPut(token: string, path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}/sheets/v2/spreadsheets/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { msg?: string };
    console.warn("[lark-sheet] style call failed:", data.msg ?? res.status);
  }
}

/**
 * Dòng tiêu đề: nền đậm, chữ trắng đậm, căn giữa, có viền.
 * Kèm đóng băng dòng 1 để cuộn xuống vẫn biết mình đang đọc cột nào — đây là
 * thứ khiến một bảng log dài trông ra bảng làm việc thay vì bãi dữ liệu.
 */
async function styleSheet(
  token: string,
  sheetToken: string,
  sheetId: string,
  columns: Column[],
): Promise<void> {
  const last = colLetter(columns.length - 1);

  // Đóng băng dòng tiêu đề.
  await fetch(`${BASE}/sheets/v2/spreadsheets/${sheetToken}/sheets_batch_update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ updateSheet: { properties: { sheetId, frozenRowCount: 1 } } }],
    }),
  }).catch(() => null);

  // Định dạng dòng tiêu đề.
  await larkPut(token, `${sheetToken}/style`, {
    appendStyle: {
      range: `${sheetId}!A1:${last}1`,
      style: {
        font: { bold: true, fontSize: "10pt/1.5" },
        backColor: "#1F2937",
        foreColor: "#FFFFFF",
        hAlign: 1,
        vAlign: 1,
        borderType: "FULL_BORDER",
        borderColor: "#374151",
      },
    },
  });

  // Độ rộng cột — gộp các cột liền nhau cùng độ rộng thành một lời gọi.
  let runStart = 0;
  for (let i = 1; i <= columns.length; i += 1) {
    if (i < columns.length && columns[i].width === columns[runStart].width) continue;
    await larkPut(token, `${sheetToken}/dimension_range`, {
      dimension: {
        sheetId,
        majorDimension: "COLUMNS",
        // dimension_range đánh số từ 1 và bao gồm cả hai đầu.
        startIndex: runStart + 1,
        endIndex: i,
      },
      dimensionProperties: { fixedSize: columns[runStart].width },
    });
    runStart = i;
  }

  // Cột số: căn phải + dấu phân cách nghìn. Chỉ đụng từ dòng 2 xuống để không
  // đè lên định dạng tiêu đề vừa đặt.
  for (let i = 0; i < columns.length; i += 1) {
    const type = columns[i].type;
    if (type !== "money" && type !== "number") continue;
    const letter = colLetter(i);
    await larkPut(token, `${sheetToken}/style`, {
      appendStyle: {
        range: `${sheetId}!${letter}2:${letter}`,
        style: { formatter: "#,##0", hAlign: 2 },
      },
    });
  }
}

/**
 * Trả sheetId của tab `title`, tạo mới + ghi dòng tiêu đề nếu chưa có.
 * `title` cũng chấp nhận chính sheetId (cấu hình cũ nhập ID thay vì tên).
 */
async function ensureSheet(
  token: string,
  sheetToken: string,
  title: string,
  columns: Column[],
): Promise<string | null> {
  const cacheKey = `${sheetToken}:${title}`;
  const cached = sheetIdCache.get(cacheKey);
  if (cached) return cached;

  const header = columns.map((c) => c.label);

  const sheets = await listSheets(token, sheetToken);
  const found = sheets.find((s) => s.title === title || s.sheetId === title);
  if (found) {
    sheetIdCache.set(cacheKey, found.sheetId);
    // Bảng rỗng (tab do người dùng tự tạo) thì bù dòng tiêu đề và tạo dáng.
    // Tab đã có dữ liệu thì không đụng vào: người dùng có thể đã tự chỉnh.
    if (!found.rowCount) {
      await appendValues(token, sheetToken, found.sheetId, [header]);
      await styleSheet(token, sheetToken, found.sheetId, columns).catch(() => null);
    }
    return found.sheetId;
  }

  const created = await createSheet(token, sheetToken, title);
  if (!created) return null;
  sheetIdCache.set(cacheKey, created);
  await appendValues(token, sheetToken, created, [header]);
  await styleSheet(token, sheetToken, created, columns).catch(() => null);
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

  const sheetId = await ensureSheet(token, config.sheetToken, title, def.columns);
  if (!sheetId) return { ok: false, reason: "sheet_unavailable" };

  // Cắt/đệm cho khớp số cột tiêu đề — lệch cột là bảng hỏng.
  const row: Array<string | number> = def.columns.map((col, i) => {
    const v = cells[i];
    const numeric = col.type === "money" || col.type === "number";

    if (v === null || v === undefined || v === "") {
      // Ô số để TRỐNG chứ không điền "—": một gạch ngang lọt vào cột tiền là
      // cả cột hoá chữ, hết cộng được.
      return numeric ? "" : "—";
    }

    if (numeric) {
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : "";
    }

    return String(v);
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

/**
 * Áp lại định dạng cho MỌI tab đã tồn tại trong bảng tính.
 *
 * `ensureSheet` chỉ tạo dáng cho tab mới, nên bảng dựng từ trước vẫn trơ. Hàm
 * này để admin bấm một nút là toàn bộ tab cũ có tiêu đề đậm, cột đúng độ rộng
 * và cột tiền căn phải — không phải xoá bảng đi dựng lại.
 *
 * Chỉ đụng phần trình bày, không ghi/xoá một ô dữ liệu nào.
 */
export async function restyleLarkSheets(): Promise<{ ok: boolean; styled: number; reason?: string }> {
  const config = await readConfig();
  if (!config) return { ok: false, styled: 0, reason: "not_configured" };

  const token = await getTenantToken(config.appId, config.appSecret);
  if (!token) return { ok: false, styled: 0, reason: "auth_failed" };

  const sheets = await listSheets(token, config.sheetToken);
  if (sheets.length === 0) return { ok: false, styled: 0, reason: "sheet_unavailable" };

  let styled = 0;
  for (const key of Object.keys(SHEETS) as SheetKey[]) {
    const def = SHEETS[key];
    const title =
      key === "dang_ky" && config.legacyRegisterTab ? config.legacyRegisterTab : def.title;
    const found = sheets.find((sh) => sh.title === title || sh.sheetId === title);
    if (!found) continue;
    await styleSheet(token, config.sheetToken, found.sheetId, def.columns).catch(() => null);
    styled += 1;
  }

  return { ok: styled > 0, styled, reason: styled > 0 ? undefined : "no_matching_tab" };
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
