/**
 * Đếm hành vi xấu theo IP rồi ra lệnh chặn.
 *
 * Nguồn duy nhất: đăng nhập sai liên tiếp (`recordFailure`) — đó là dò mật
 * khẩu, chỉ một tài khoản cụ thể bị nhắm nên đếm theo IP mới có nghĩa.
 *
 * KHÔNG tự chặn vì ăn 429 nhiều lần nữa: bị chặn tốc độ không chứng minh được
 * ý đồ xấu (một IP nhà mạng gánh cả khu, người dùng bấm nhanh), còn kẻ đánh
 * thật thì xoay IP liên tục — chặn theo IP chỉ khoá nhầm người thật. Flood/
 * DDoS phải cản ở biên (Cloudflare / Vercel Firewall).
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
