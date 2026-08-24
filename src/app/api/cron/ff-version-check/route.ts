import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { fetchFFVersion, checkCdnUrls, DEFAULT_CDN_PATTERNS } from "@/lib/server/ff-version";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import type { NotifySection } from "@/lib/server/telegram-notify";
import { notifyUserFFVersion } from "@/lib/server/user-notify";
import { SITE_URL } from "@/lib/constants/site";
import { withCron } from "@/lib/server/ops-log";

const VERSION_KEY = "ff.last_known_version";
const PATTERNS_KEY = "ff.cdn_url_patterns";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = withCron("ff-version-check", async () => {

  const info = await fetchFFVersion();
  if (!info) {
    return NextResponse.json({ ok: false, error: "Failed to fetch version from Play Store" });
  }

  const sb = createAdminSupabaseClient();
  if (!sb) return NextResponse.json({ ok: false, error: "No DB" });

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
    let patterns = DEFAULT_CDN_PATTERNS;
    if (rowMap[PATTERNS_KEY]) {
      try { patterns = JSON.parse(rowMap[PATTERNS_KEY]); } catch { /* keep defaults */ }
    }

    cdnLinks = await checkCdnUrls(info.version, patterns);
    accessibleLinks = cdnLinks.filter((l) => l.accessible).map((l) => l.url);

    await untypedFrom(sb, "settings").upsert(
      { key: VERSION_KEY, value: info.version } as never,
      { onConflict: "key" } as never,
    );

    const cdnSection: NotifySection = {
      icon: "🔗",
      heading: `Link tải CDN (${accessibleLinks.length}/${cdnLinks.length} khả dụng)`,
      rows: cdnLinks.length > 0
        ? cdnLinks.map((l) => ({
            label: l.accessible
              ? `${formatSize(l.size)}`
              : "Không có",
            value: l.url.replace("https://dl.dir.freefiremobile.com/", "…/"),
            mono: true,
            status: (l.accessible ? "ok" : "err") as "ok" | "err",
          }))
        : [{ label: "Trạng thái", value: "Chưa tìm được — cần cấu hình pattern", status: "warn" as const }],
    };

    const payload = {
      title: "🎮 FREE FIRE — PHIÊN BẢN MỚI",
      subtitle: `Phát hiện lúc ${vnNow()} (ICT)`,
      sections: [
        {
          icon: "📦",
          heading: "Thông tin cập nhật",
          rows: [
            { label: "Phiên bản cũ", value: lastVersion || "Chưa có", mono: true },
            { label: "Phiên bản mới", value: info.version, mono: true, bold: true },
            { label: "Nguồn", value: "Google Play Store (VN)" },
            { label: "Package", value: info.packageId, mono: true },
          ],
        },
        cdnSection,
      ],
      actions: [
        {
          label: "▶️ Google Play Store",
          url: "https://play.google.com/store/apps/details?id=com.dts.freefireth&hl=vi",
        },
      ],
      footer: "🎮 Arex FF Monitor",
    };

    await Promise.all([
      sendTelegramNotification(payload).catch(() => null),
      notifyUserFFVersion(
        info.version,
        accessibleLinks,
        SITE_URL,
      ),
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
});

function formatSize(bytes?: number): string {
  if (!bytes) return "Link";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
