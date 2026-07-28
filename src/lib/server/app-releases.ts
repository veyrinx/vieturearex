import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const APP_RELEASES_BUCKET = "app-releases";

/** Bucket để private → link tải là signed URL, hết hạn sau ngần này giây. */
export const SIGNED_URL_TTL = 60 * 30;

export type AppPlatform = "android" | "ios";

export type AppRelease = {
  /** Đường dẫn trong bucket, ví dụ `android/1.0.0/app-debug.apk`. */
  path: string;
  platform: AppPlatform;
  version: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string | null;
};

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

/** Ký link tải tạm thời cho một file trong bucket. */
export async function signAppRelease(path: string): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data } = await db.storage
    .from(APP_RELEASES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL, { download: true });

  return data?.signedUrl ?? null;
}
