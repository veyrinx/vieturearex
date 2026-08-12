/**
 * Visitor IP logger — records all IPs visiting the site.
 * Uses a per-process in-memory dedup cache to avoid hammering the DB on every
 * request, then flushes to the `security.visitor_ips` settings key.
 */

export type VisitorEntry = {
  ip: string;
  lastPath: string;
  ua: string;
  lastSeen: number; // Unix ms
  count: number;
};

const VISITOR_IPS_KEY = "security.visitor_ips";
const LOG_INTERVAL_MS = 2 * 60 * 1000; // don't re-log same IP for 2 minutes
const MAX_ENTRIES = 500;

// Per-process dedup map: ip → last logged timestamp
const recentLog = new Map<string, number>();
// Máy Fluid được dùng lại giữa nhiều request nên map này sống rất lâu. Không
// dọn thì nó phình theo số IP đã ghé — càng chạy lâu càng ngốn bộ nhớ.
const RECENT_LOG_MAX = 5_000;
let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;

function pruneRecentLog(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS && recentLog.size < RECENT_LOG_MAX) return;
  lastPrune = now;
  for (const [ip, at] of Array.from(recentLog.entries())) {
    if (now - at >= LOG_INTERVAL_MS) recentLog.delete(ip);
  }
  // Vẫn quá đông (bị quét hàng loạt) thì bỏ hẳn, xây lại từ đầu.
  if (recentLog.size > RECENT_LOG_MAX) recentLog.clear();
}

/** Returns true if this IP should be persisted right now. */
export function shouldLogVisitor(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  const now = Date.now();
  pruneRecentLog(now);
  const last = recentLog.get(ip);
  if (last && now - last < LOG_INTERVAL_MS) return false;
  recentLog.set(ip, now);
  return true;
}

/** Merge a new visit into the existing visitor map and return updated JSON. */
export function mergeVisitorEntry(
  existing: Record<string, VisitorEntry>,
  ip: string,
  path: string,
  ua: string,
): Record<string, VisitorEntry> {
  const prev = existing[ip];
  existing[ip] = {
    ip,
    lastPath: path.slice(0, 120),
    ua: ua.slice(0, 120),
    lastSeen: Date.now(),
    count: (prev?.count ?? 0) + 1,
  };

  // Trim to MAX_ENTRIES — remove oldest entries
  const entries = Object.values(existing);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b.lastSeen - a.lastSeen);
    const trimmed: Record<string, VisitorEntry> = {};
    for (const e of entries.slice(0, MAX_ENTRIES)) trimmed[e.ip] = e;
    return trimmed;
  }

  return existing;
}

export { VISITOR_IPS_KEY };
