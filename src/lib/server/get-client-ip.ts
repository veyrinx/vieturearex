import type { NextRequest } from "next/server";

// Private/reserved IP ranges (should never be real client IPs behind a proxy)
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^localhost$/i,
];

function isPrivate(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

function normalizeIp(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
}

/**
 * Extract the most accurate real client IP from a request.
 * Priority order (most trusted first):
 *  1. cf-connecting-ip   — Cloudflare edge (single IP, always real)
 *  2. true-client-ip     — Cloudflare Enterprise / Akamai
 *  3. x-real-ip          — nginx / most reverse-proxy configs (single IP)
 *  4. x-forwarded-for    — first non-private IP in the chain
 *  5. x-client-ip        — some CDNs / load balancers
 *  6. x-cluster-client-ip — Heroku, some clusters
 *  7. "unknown"          — fallback
 */
export function getClientIp(request: NextRequest): string {
  // 1. Cloudflare connecting IP (always a single, real IP)
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) {
    const ip = normalizeIp(cf);
    if (ip && !isPrivate(ip)) return ip;
  }

  // 2. Cloudflare Enterprise / Akamai
  const tci = request.headers.get("true-client-ip");
  if (tci) {
    const ip = normalizeIp(tci);
    if (ip && !isPrivate(ip)) return ip;
  }

  // 3. nginx x-real-ip (single value, already unwrapped)
  const xri = request.headers.get("x-real-ip");
  if (xri) {
    const ip = normalizeIp(xri);
    if (ip && !isPrivate(ip)) return ip;
  }

  // 4. x-forwarded-for — scan left-to-right for first non-private IP
  //    The leftmost entry is set by the client, so proxies append to the right.
  //    We want the rightmost *trusted* proxy-added IP, but since we can't know
  //    the proxy topology, the first non-private IP is the best heuristic.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    for (const part of parts) {
      const ip = normalizeIp(part);
      if (ip && !isPrivate(ip)) return ip;
    }
    // All were private (internal network) - use the leftmost anyway
    const fallback = normalizeIp(parts[0] ?? "");
    if (fallback) return fallback;
  }

  // 5. x-client-ip
  const xci = request.headers.get("x-client-ip");
  if (xci) {
    const ip = normalizeIp(xci);
    if (ip && !isPrivate(ip)) return ip;
  }

  // 6. x-cluster-client-ip
  const xcc = request.headers.get("x-cluster-client-ip");
  if (xcc) {
    const ip = normalizeIp(xcc);
    if (ip && !isPrivate(ip)) return ip;
  }

  return "unknown";
}
