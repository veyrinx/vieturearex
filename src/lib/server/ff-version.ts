import "server-only";

export interface FFVersionInfo {
  version: string;       // e.g. "1.123.1"
  packageId: string;
  source: "playstore";
  fetchedAt: string;     // ISO
}

export interface CdnLinkResult {
  url: string;
  accessible: boolean;
  size?: number;         // bytes from Content-Length header
}

// Scrape Play Store for the current published version
export async function fetchFFVersion(): Promise<FFVersionInfo | null> {
  try {
    const res = await fetch(
      "https://play.google.com/store/apps/details?id=com.dts.freefireth&hl=vi&gl=VN",
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;
    const html = await res.text();

    // Play Store embeds version as [[["1.x.x"]]]
    const match = html.match(/\[\[\["(\d+\.\d+[\.\d]*)"(?!.*\[\[\[")/);
    if (!match) return null;

    return {
      version: match[1],
      packageId: "com.dts.freefireth",
      source: "playstore",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Verify a list of CDN URL patterns against the version, return which are accessible
export async function checkCdnUrls(
  version: string,
  patterns: string[],
): Promise<CdnLinkResult[]> {
  const results = await Promise.all(
    patterns.map(async (pattern): Promise<CdnLinkResult> => {
      const url = pattern
        .replace(/\{version\}/g, version)
        .replace(/\{version_nodot\}/g, version.replace(/\./g, ""))
        .replace(/\{v_major\}/g, version.split(".")[0] ?? "")
        .replace(/\{v_minor\}/g, version.split(".")[1] ?? "")
        .replace(/\{v_patch\}/g, version.split(".")[2] ?? "");

      try {
        const res = await fetch(url, { method: "HEAD", next: { revalidate: 0 } });
        if (res.ok) {
          const cl = res.headers.get("content-length");
          return { url, accessible: true, size: cl ? Number(cl) : undefined };
        }
        return { url, accessible: false };
      } catch {
        return { url, accessible: false };
      }
    }),
  );

  return results;
}

// Default URL patterns — admin can override via settings key "ff.cdn_url_patterns" (JSON array)
export const DEFAULT_CDN_PATTERNS: string[] = [
  "https://dl.dir.freefiremobile.com/common/Local/Vn/{version}.zip",
  "https://dl.dir.freefiremobile.com/common/Local/Vn/ffvn_{version}.zip",
  "https://dl.dir.freefiremobile.com/common/Local/Vn/LocalVn_{version}.zip",
  "https://dl.dir.freefiremobile.com/common/Local/Vn/LocalVn_{version_nodot}.zip",
  "https://dl.dir.freefiremobile.com/common/apk/Vn/GarenaFreeFire_{version}.apk",
  "https://dl.dir.freefiremobile.com/common/apk/Vn/ffvn_{version}.apk",
];
