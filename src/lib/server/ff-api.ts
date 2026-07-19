/**
 * Client HL Gaming Official Free Fire API — CHỈ dùng server-side.
 *
 * Gọi thẳng REST endpoint bằng fetch thay vì package `hl-gaming-official-ff-data`
 * (v3.0.0 crash ở constructor do bug lru-cache: `new LRU()` với lru-cache@10).
 *
 * API key & developer UID nằm trong .env.local, tuyệt đối không lộ ra client.
 */

const BASE_URL = "https://proapis.hlgamingofficial.com/main/games/freefire/account/api";

const API_KEY = process.env.HLFF_API_KEY;
const USER_UID = process.env.HLFF_USER_UID || "";
const REGION = process.env.HLFF_REGION || "vn";

export type FfSection =
  | "AllData"
  | "AccountInfo"
  | "Account Profile Info"
  | "Guild Info"
  | "Pet Info"
  | "Social Info"
  | "Ban Check";

export type FfResponse = {
  result?: Record<string, unknown>;
  usage?: { remainingToday?: number; [key: string]: unknown };
  error?: string;
  [key: string]: unknown;
};

/** Đã cấu hình đủ API key + developer UID chưa. */
export function isFfApiConfigured(): boolean {
  return Boolean(API_KEY && USER_UID);
}

const UID_RE = /^\d{4,15}$/;

/** Chuẩn hoá & validate Player UID (chỉ chữ số). */
export function normalizePlayerUid(raw: string): string | null {
  const uid = raw.trim();
  return UID_RE.test(uid) ? uid : null;
}

async function callSection(
  section: FfSection,
  playerUid: string,
  opts: { region?: string; signal?: AbortSignal } = {},
): Promise<FfResponse> {
  if (!API_KEY || !USER_UID) {
    throw new Error("Chưa cấu hình HLFF_API_KEY / HLFF_USER_UID.");
  }
  const params = new URLSearchParams({
    sectionName: section,
    PlayerUid: playerUid,
    region: opts.region || REGION,
    useruid: USER_UID,
    api: API_KEY,
  });
  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    signal: opts.signal,
    // Cache CDN 60s để tiết kiệm quota; dữ liệu người chơi đổi chậm.
    next: { revalidate: 60 },
  });
  const data = (await res.json().catch(() => ({}))) as FfResponse;
  if (!res.ok) {
    throw new Error(data?.error || `HL API lỗi ${res.status}`);
  }
  return data;
}

/** Toàn bộ dữ liệu người chơi (AccountInfo + Guild + Pet + ...). */
export function getPlayerAllData(playerUid: string): Promise<FfResponse> {
  return callSection("AllData", playerUid);
}

/** Chỉ thông tin tài khoản. */
export function getPlayerAccountInfo(playerUid: string): Promise<FfResponse> {
  return callSection("AccountInfo", playerUid);
}

/** Kiểm tra tài khoản có bị khóa không. */
export function getPlayerBanCheck(playerUid: string): Promise<FfResponse> {
  return callSection("Ban Check", playerUid);
}
