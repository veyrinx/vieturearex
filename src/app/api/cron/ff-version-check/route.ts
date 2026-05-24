import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { fetchFFVersion, checkCdnUrls, DEFAULT_CDN_PATTERNS } from "@/lib/server/ff-version";
import { sendTelegramNotification } from "@/lib/server/telegram-notify";
import { sendLarkNotification } from "@/lib/server/lark-notify";

const VERSION_KEY = "ff.last_known_version";
const PATTERNS_KEY = "ff.cdn_url_patterns";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch current version from Play Store
  const info = await fetchFFVersion();
  if (!info) {
    return NextResponse.json({ ok: false, error: "Failed to fetch version from Play Store" });
  }

  const sb = createAdminSupabaseClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" });

  // Get last known version + custom URL patterns from settings
  const { data: rows } = await sb
    .from("settings")
    .select("key, value")
    .in("key", [VERSION_KEY, PATTERNS_KEY]) as unknown as { data: { key: string; value: string }[] | null };

  const rowMap = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  const lastVersion = rowMap[VERSION_KEY] ?? "";
  const isNew = info.version !== lastVersion;

  let cdnLinks: { url: string; accessible: boolean; size?: number }[] = [];
  let accessibleLinks: string[] = [];

  if (isNew) {
    // Resolve URL patterns: use admin-configured patterns if set, else defaults
    let patterns = DEFAULT_CDN_PATTERNS;
    if (rowMap[PATTERNS_KEY]) {
      try { patterns = JSON.parse(rowMap[PATTERNS_KEY]); } catch { /* keep defaults */ }
    }

    cdnLinks = await checkCdnUrls(info.version, patterns);
    accessibleLinks = cdnLinks.filter((l) => l.accessible).map((l) => l.url);

    // Persist new version
    await untypedFrom(sb, "settings").upsert(
      { key: VERSION_KEY, value: info.version } as never,
      { onConflict: "key" } as never,
    );

    // Build notification
    const lines: { label: string; value: string }[] = [
      { label: "Phiên bản", value: info.version },
      { label: "Trước đó", value: lastVersion || "Chưa có" },
      { label: "Nguồn", value: "Google Play Store (VN)" },
    ];

    if (accessibleLinks.length > 0) {
      accessibleLinks.forEach((url, i) => {
        lines.push({ label: `Link tải ${i + 1}`, value: url });
      });
    } else {
      lines.push({ label: "Link CDN", value: "Chưa tìm được — kiểm tra thủ công" });
    }

    const payload = {
      title: `🎮 Free Fire cập nhật phiên bản ${info.version}`,
      lines,
      url: "https://play.google.com/store/apps/details?id=com.dts.freefireth&hl=vi",
    };

    await Promise.all([
      sendTelegramNotification(payload).catch(() => null),
      sendLarkNotification(payload).catch(() => null),
    ]);
  }

  return NextResponse.json({
    ok: true,
    isNew,
    version: info.version,
    lastVersion,
    cdnLinks,
    accessibleLinks,
  });
}
