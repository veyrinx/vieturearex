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

// ── Bộ nhớ đệm + trần quota ─────────────────────────────────────────────────
// Quota HL Gaming tính theo NGÀY cho cả site, trong khi giới hạn theo IP ở
// api-guard chỉ chặn được một người gọi nhiều. Vài trăm người mỗi người vài lượt
// là cạn quota, và lúc đó MỌI tính năng FF (tra cứu, chợ, quét nick) cùng chết.
// Ba lớp chắn ở đây:
//   1. đệm theo (section, uid) 5 phút — chỉ số người chơi đổi rất chậm;
//   2. gộp các yêu cầu trùng đang bay (nhiều người cùng tra một UID hot);
//   3. biết quota đã cạn thì báo lỗi rõ ràng thay vì đốt thêm lượt gọi.
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 500;
/** Tin số lượt còn lại trong ngần này thì khỏi gọi thử lại. */
const QUOTA_TRUST_MS = 15 * 60_000;

type CacheEntry = { data: FfResponse; expires: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<FfResponse>>();

let quota: { remainingToday: number | null; checkedAt: number } = { remainingToday: null, checkedAt: 0 };
const stats = { calls: 0, hits: 0, errors: 0, since: Date.now() };

function pruneCache() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  // Vẫn quá đầy thì bỏ các mục cũ nhất (Map giữ thứ tự thêm vào).
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function quotaExhausted(): boolean {
  return (
    quota.remainingToday !== null &&
    quota.remainingToday <= 0 &&
    Date.now() - quota.checkedAt < QUOTA_TRUST_MS
  );
}

/** Trạng thái quota + hiệu quả đệm — /admin/ops đọc để biết còn bao nhiêu lượt. */
export function getFfApiStatus() {
  return {
    configured: isFfApiConfigured(),
    remainingToday: quota.remainingToday,
    quotaCheckedAt: quota.checkedAt ? new Date(quota.checkedAt).toISOString() : null,
    exhausted: quotaExhausted(),
    cacheEntries: cache.size,
    calls: stats.calls,
    cacheHits: stats.hits,
    errors: stats.errors,
    // Tiến trình serverless sống ngắn: số liệu tính từ lúc tiến trình này khởi động.
    since: new Date(stats.since).toISOString(),
  };
}

async function fetchSection(
  section: FfSection,
  playerUid: string,
  region: string,
  signal?: AbortSignal,
): Promise<FfResponse> {
  const params = new URLSearchParams({
    sectionName: section,
    PlayerUid: playerUid,
    region,
    useruid: USER_UID as string,
    api: API_KEY as string,
  });
  stats.calls += 1;
  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    signal,
    // Cache CDN 60s để tiết kiệm quota; dữ liệu người chơi đổi chậm.
    next: { revalidate: 60 },
  });
  const data = (await res.json().catch(() => ({}))) as FfResponse;

  // Bên HL trả số lượt còn lại kèm mỗi phản hồi — bám vào đó thay vì tự đếm,
  // vì nhiều tiến trình serverless chạy song song, đếm riêng là sai.
  const remaining = data?.usage?.remainingToday;
  if (typeof remaining === "number") quota = { remainingToday: remaining, checkedAt: Date.now() };

  if (!res.ok) {
    stats.errors += 1;
    throw new Error(data?.error || `HL API lỗi ${res.status}`);
  }
  return data;
}

async function callSection(
  section: FfSection,
  playerUid: string,
  opts: { region?: string; signal?: AbortSignal } = {},
): Promise<FfResponse> {
  if (!API_KEY || !USER_UID) {
    throw new Error("Chưa cấu hình HLFF_API_KEY / HLFF_USER_UID.");
  }
  const region = opts.region || REGION;
  const key = `${section}|${region}|${playerUid}`;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    stats.hits += 1;
    return cached.data;
  }

  // Có signal riêng thì đi đường thẳng: gộp chung mà một bên huỷ là các bên
  // còn lại chết theo.
  if (opts.signal) return fetchSection(section, playerUid, region, opts.signal);

  const flying = inflight.get(key);
  if (flying) {
    stats.hits += 1;
    return flying;
  }

  if (quotaExhausted()) {
    throw new Error("Đã hết lượt tra cứu Free Fire trong hôm nay, thử lại vào ngày mai.");
  }

  const promise = fetchSection(section, playerUid, region)
    .then((data) => {
      cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      pruneCache();
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
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
