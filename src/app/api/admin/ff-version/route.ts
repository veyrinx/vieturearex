import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchFFVersion, checkCdnUrls, DEFAULT_CDN_PATTERNS } from "@/lib/server/ff-version";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { untypedFrom } from "@/lib/supabase/untyped";

const VERSION_KEY = "ff.last_known_version";
const PATTERNS_KEY = "ff.cdn_url_patterns";

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const sb = createAdminSupabaseClient();
  if (!sb) return NextResponse.json({ error: "No DB" }, { status: 500 });

  const [info, { data: rows }] = await Promise.all([
    fetchFFVersion(),
    sb.from("settings").select("key, value").in("key", [VERSION_KEY, PATTERNS_KEY]) as unknown as Promise<{ data: { key: string; value: string }[] | null }>,
  ]);

  const rowMap = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  const lastVersion = rowMap[VERSION_KEY] ?? null;

  let patterns = DEFAULT_CDN_PATTERNS;
  if (rowMap[PATTERNS_KEY]) {
    try { patterns = JSON.parse(rowMap[PATTERNS_KEY]); } catch { /* keep defaults */ }
  }

  let cdnLinks: { url: string; accessible: boolean; size?: number }[] = [];
  if (info) {
    cdnLinks = await checkCdnUrls(info.version, patterns);
  }

  return NextResponse.json({
    current: info,
    lastKnown: lastVersion,
    isNew: info ? info.version !== lastVersion : false,
    patterns,
    cdnLinks,
  });
}

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await request.json()) as { patterns?: string[] };
  if (!Array.isArray(body.patterns)) {
    return NextResponse.json({ error: "patterns must be an array" }, { status: 400 });
  }

  const sb = createAdminSupabaseClient();
  if (!sb) return NextResponse.json({ error: "No DB" }, { status: 500 });

  await untypedFrom(sb, "settings").upsert(
    { key: PATTERNS_KEY, value: JSON.stringify(body.patterns) } as never,
    { onConflict: "key" } as never,
  );

  return NextResponse.json({ ok: true, saved: body.patterns.length });
}
