/**
 * IP Blocker — tracks failed login attempts and blocks repeat offenders.
 * Uses in-memory store (fast) + persists blocked IPs to Supabase settings.
 */

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
