import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

// Multiple endpoints to try (in order)
const ENDPOINTS = [
  {
    name: "jsDelivr v1/packages",
    url: "https://data.jsdelivr.com/v1/packages/gh/ShahGCreator/icon@main?structure=flat",
    parser: parseJsdelivrV1,
  },
  {
    name: "jsDelivr v1/package (legacy)",
    url: "https://data.jsdelivr.com/v1/package/gh/ShahGCreator/icon@main/flat",
    parser: parseJsdelivrLegacy,
  },
  {
    name: "GitHub contents API",
    url: "https://api.github.com/repos/ShahGCreator/icon/contents/PNG",
    parser: parseGitHub,
  },
];

type JsdelivrV1 = { files?: Array<{ name: string }> };
function parseJsdelivrV1(data: unknown): string[] {
  const d = data as JsdelivrV1;
  const ids = new Set<string>();
  for (const f of d.files ?? []) {
    const m = f.name.match(/^\/?PNG\/([^/]+)\.png$/i);
    if (m && m[1]) ids.add(m[1]);
  }
  return [...ids];
}

type JsdelivrLegacy = { files?: Array<{ name: string; type: string }> };
function parseJsdelivrLegacy(data: unknown): string[] {
  const d = data as JsdelivrLegacy;
  const ids = new Set<string>();
  for (const f of d.files ?? []) {
    if (f.type !== "file") continue;
    const m = f.name.match(/^\/?PNG\/([^/]+)\.png$/i);
    if (m && m[1]) ids.add(m[1]);
  }
  return [...ids];
}

type GitHubContent = Array<{ name: string; type: string }>;
function parseGitHub(data: unknown): string[] {
  const d = data as GitHubContent;
  if (!Array.isArray(d)) return [];
  const ids = new Set<string>();
  for (const item of d) {
    if (item.type !== "file") continue;
    const m = item.name.match(/^(.+)\.png$/i);
    if (m && m[1]) ids.add(m[1]);
  }
  return [...ids];
}

// In-memory cache for 1 hour
let cache: { ids: string[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-index", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = Date.now();
  if (!force && cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ids: cache.ids, cached: true, count: cache.ids.length, source: "cache" });
  }

  const errors: Array<{ endpoint: string; status?: number; error: string }> = [];

  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "arex-admin/1.0",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        errors.push({ endpoint: ep.name, status: res.status, error: await res.text().then((t) => t.slice(0, 200)).catch(() => "") });
        continue;
      }

      const data = await res.json();
      const ids = ep.parser(data);

      if (ids.length === 0) {
        errors.push({ endpoint: ep.name, error: "Parser trả về 0 items" });
        continue;
      }

      const sorted = ids.sort();
      cache = { ids: sorted, ts: now };
      return NextResponse.json({
        ids: sorted,
        cached: false,
        count: sorted.length,
        source: ep.name,
      });
    } catch (err) {
      errors.push({ endpoint: ep.name, error: String(err).slice(0, 200) });
      continue;
    }
  }

  // All endpoints failed
  return NextResponse.json({
    error: "Tất cả endpoint đều lỗi",
    details: errors,
  }, { status: 502 });
}
