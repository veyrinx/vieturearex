/**
 * Đếm hành vi xấu theo IP rồi ra lệnh chặn.
 *
 * Hai nguồn:
 *  1. Đăng nhập sai liên tiếp (`recordFailure`) — có từ trước.
 *  2. Cố tình spam: bị chặn tốc độ (429) hết lần này tới lần khác
 *     (`recordRateLimitViolation`). Bị 429 một hai nhịp là chuyện thường của
 *     người dùng thật bấm nhanh; bị 429 liên tục trong nhiều phút thì không
 *     còn là nhầm nữa.
 *
 * Bộ đếm nằm trong RAM nên chỉ đúng trong phạm vi một máy — cố ý: nó chỉ để
 * PHÁT HIỆN. Lệnh chặn thì ghi xuống `security.blocked_ips` để mọi máy cùng
 * thấy, và middleware là nơi thi hành (xem `lib/constants/ip-block.ts`).
 */

import { getSettings, updateSetting } from "@/lib/data/content-service";
import {
  AUTO_BLOCK_DURATION_MS,
  SETTINGS_KEY_BLOCKED_IPS,
  SETTINGS_KEY_IP_WHITELIST,
  parseBlockedIps,
  parseIpWhitelist,
  upsertBlock,
} from "@/lib/constants/ip-block";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;    // 15 minutes
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

type FailureBucket = { count: number; firstAt: number };
const failures = new Map<string, FailureBucket>();

// In-process blocked IPs cache (refreshed from DB periodically)
type BlockedEntry = { ip: string; blockedAt: number; reason: string };
let blockedCache: BlockedEntry[] = [];
let cacheRefreshedAt = 0;
const CACHE_TTL = 60_000; // 1 minute

export function recordFailure(ip: string): { blocked: boolean } {
  const now = Date.now();
  const bucket = failures.get(ip);

  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    failures.set(ip, { count: 1, firstAt: now });
    return { blocked: false };
  }

  bucket.count += 1;
  failures.set(ip, bucket);

  if (bucket.count >= MAX_FAILURES) {
    failures.delete(ip);
    // Add to in-process cache immediately so next request is blocked
    blockedCache = blockedCache.filter((e) => e.ip !== ip);
    blockedCache.push({ ip, blockedAt: now, reason: `${MAX_FAILURES} lần đăng nhập sai liên tiếp` });
    return { blocked: true };
  }

  return { blocked: false };
}

export function isBlockedInMemory(ip: string): boolean {
  const now = Date.now();
  // Refresh expired entries
  blockedCache = blockedCache.filter((e) => now - e.blockedAt < BLOCK_DURATION_MS);
  return blockedCache.some((e) => e.ip === ip);
}

export function unblockInMemory(ip: string) {
  blockedCache = blockedCache.filter((e) => e.ip !== ip);
  failures.delete(ip);
}

export function getInMemoryBlockedIps(): BlockedEntry[] {
  const now = Date.now();
  blockedCache = blockedCache.filter((e) => now - e.blockedAt < BLOCK_DURATION_MS);
  return [...blockedCache];
}

export function getFailureCount(ip: string): number {
  const now = Date.now();
  const bucket = failures.get(ip);
  if (!bucket || now - bucket.firstAt > WINDOW_MS) return 0;
  return bucket.count;
}

export function refreshBlockedCache(entries: BlockedEntry[]) {
  const now = Date.now();
  cacheRefreshedAt = now;
  // Merge: keep in-memory additions that are not in the DB list yet
  const dbIps = new Set(entries.map((e) => e.ip));
  const localOnly = blockedCache.filter((e) => !dbIps.has(e.ip));
  blockedCache = [...entries.filter((e) => now - e.blockedAt < BLOCK_DURATION_MS), ...localOnly];
}

export function shouldRefreshCache(): boolean {
  return Date.now() - cacheRefreshedAt > CACHE_TTL;
}

// ── Cố tình spam ────────────────────────────────────────────────────────────

/** Cửa sổ đếm số lần ăn 429. */
const SPAM_WINDOW_MS = 10 * 60 * 1000;
/**
 * Ngưỡng chặn. Đặt rộng tay: nhiều người Việt dùng chung một IP nhà mạng, chặn
 * hụt còn hơn chặn nhầm cả một khu.
 */
const SPAM_VIOLATIONS = 8;
/** Chặn kẻ spam lâu hơn hạn mặc định — nó sẽ quay lại. */
const SPAM_BLOCK_DURATION_MS = 6 * 60 * 60 * 1000;

type SpamBucket = { count: number; firstAt: number; routes: Set<string> };
const spam = new Map<string, SpamBucket>();

/**
 * Ghi một lần bị chặn tốc độ. Trả về mô tả lệnh chặn khi IP đã vượt ngưỡng,
 * `null` khi chưa tới mức.
 */
export function recordRateLimitViolation(
  ip: string,
  route: string,
): { reason: string; count: number } | null {
  if (!ip || ip === "unknown") return null;

  const now = Date.now();
  const bucket = spam.get(ip);

  if (!bucket || now - bucket.firstAt > SPAM_WINDOW_MS) {
    spam.set(ip, { count: 1, firstAt: now, routes: new Set([route]) });
    return null;
  }

  bucket.count += 1;
  bucket.routes.add(route);

  if (bucket.count < SPAM_VIOLATIONS) return null;

  spam.delete(ip);
  const routes = [...bucket.routes].slice(0, 4).join(", ");
  return {
    count: bucket.count,
    reason: `Spam: ${bucket.count} lần vượt giới hạn trong ${Math.round(SPAM_WINDOW_MS / 60_000)} phút (${routes})`,
  };
}

/**
 * Ghi lệnh chặn xuống settings để middleware trên MỌI máy cùng thi hành.
 *
 * Không bao giờ ném lỗi ra ngoài: đây là việc phụ chạy kèm một request đang
 * được phục vụ, hỏng thì thôi, lần vi phạm sau ghi lại.
 */
export async function persistBlock(input: {
  ip: string;
  reason: string;
  by?: string;
  durationMs?: number | null;
}): Promise<boolean> {
  const ip = input.ip.trim().toLowerCase();
  if (!ip || ip === "unknown") return false;

  try {
    const settings = await getSettings();
    const whitelist = parseIpWhitelist(
      settings.find((s) => s.key === SETTINGS_KEY_IP_WHITELIST)?.value ?? null,
    );
    // Người trực tự bấm nhanh quá thì cũng ăn 429 — không được chặn họ.
    if (whitelist.includes(ip)) return false;

    const now = Date.now();
    const list = parseBlockedIps(
      settings.find((s) => s.key === SETTINGS_KEY_BLOCKED_IPS)?.value ?? null,
    );
    const durationMs = input.durationMs === undefined ? AUTO_BLOCK_DURATION_MS : input.durationMs;
    const next = upsertBlock(
      list,
      {
        ip,
        blockedAt: now,
        reason: input.reason,
        expiresAt: durationMs === null ? null : now + durationMs,
        by: input.by,
      },
      now,
    );
    await updateSetting(SETTINGS_KEY_BLOCKED_IPS, JSON.stringify(next));

    // Chặn ngay trên máy này, khỏi đợi middleware nạp lại settings.
    blockedCache = blockedCache.filter((e) => e.ip !== ip);
    blockedCache.push({ ip, blockedAt: now, reason: input.reason });
    return true;
  } catch {
    return false;
  }
}

export { SPAM_BLOCK_DURATION_MS };
