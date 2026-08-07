import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const APP_RELEASES_BUCKET = "app-releases";

/** Bucket để private → link tải là signed URL, hết hạn sau ngần này giây. */
export const SIGNED_URL_TTL = 60 * 30;

export type AppPlatform = "android" | "ios";

/** Kho dùng chung cho hai app nên phải phân biệt được file của bên nào. */
export type ReleaseApp = "hub" | "network";

export type AppRelease = {
  /** Đường dẫn trong bucket, ví dụ `android/1.0.0-42/arex-hub-1.0.0-42.apk`. */
  path: string;
  platform: AppPlatform;
  app: ReleaseApp;
  version: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string | null;
};

/**
 * App nào là suy từ tên file — CI đặt tên `arex-hub-<version>.apk`.
 *
 * File cũ đẩy tay trước khi có quy ước này (ví dụ `app-debug.apk`) sẽ rơi vào
 * "network"; đẩy lại bằng CI là tự đúng.
 */
function appFromFileName(fileName: string): ReleaseApp {
  return /^arex[-_]hub/i.test(fileName) ? "hub" : "network";
}

const PLATFORMS: AppPlatform[] = ["android", "ios"];

/**
 * Liệt kê file cài đặt trong bucket. Cấu trúc thư mục do
 * `scripts/upload-app-release.mjs` tạo ra: <platform>/<version>/<file>.
 */
export async function listAppReleases(): Promise<AppRelease[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  const storage = db.storage.from(APP_RELEASES_BUCKET);
  const releases: AppRelease[] = [];

  for (const platform of PLATFORMS) {
    const { data: versions } = await storage.list(platform, { limit: 100 });
    if (!versions) continue;

    for (const version of versions) {
      // Supabase trả cả "thư mục" (id = null) lẫn file; chỉ thư mục mới là version.
      if (version.id) continue;

      const { data: files } = await storage.list(`${platform}/${version.name}`, { limit: 50 });
      if (!files) continue;

      for (const file of files) {
        if (!file.id) continue;
        releases.push({
          path: `${platform}/${version.name}/${file.name}`,
          platform,
          app: appFromFileName(file.name),
          version: version.name,
          fileName: file.name,
          sizeBytes: (file.metadata?.size as number | undefined) ?? 0,
          updatedAt: file.updated_at ?? file.created_at ?? null,
        });
      }
    }
  }

  // Mới nhất lên đầu.
  return releases.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

/**
 * Bản mới nhất của một app trên một nền tảng.
 *
 * `listAppReleases()` đã xếp theo thời gian tải lên giảm dần, nên phần tử đầu
 * tiên khớp bộ lọc chính là bản mới nhất — dùng thời gian chứ không so số
 * phiên bản, vì đẩy lại bản cũ để vá gấp cũng phải được coi là bản hiện hành.
 */
export async function latestAppRelease(
  app: ReleaseApp,
  platform: AppPlatform,
): Promise<AppRelease | null> {
  const releases = await listAppReleases();
  return releases.find((item) => item.app === app && item.platform === platform) ?? null;
}

/** Ký link tải tạm thời cho một file trong bucket. */
export async function signAppRelease(path: string): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data } = await db.storage
    .from(APP_RELEASES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL, { download: true });

  return data?.signedUrl ?? null;
}
