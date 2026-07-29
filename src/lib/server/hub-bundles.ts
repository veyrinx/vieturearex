import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { APP_RELEASES_BUCKET, SIGNED_URL_TTL } from "@/lib/server/app-releases";

/**
 * Bản cập nhật "nóng" (OTA) cho Arex Hub.
 *
 * Arex Hub là app đóng gói sẵn: toàn bộ giao diện là bundle React nằm trong app.
 * Nghĩa là sửa giao diện xong thì phải cài lại app — trên iOS còn phải ký lại
 * bằng Sideloadly, rất phiền. Vì thế ta cho app tải bundle mới về rồi thay ruột
 * (plugin @capgo/capacitor-updater), người dùng chỉ bấm "Cập nhật".
 *
 * Chỉ thay được JS/CSS/ảnh trong bundle. Đổi code native (thêm plugin, sửa
 * Info.plist…) vẫn phải dựng lại app và cài lại như cũ.
 *
 * Dùng chung bucket `app-releases` nhưng nhánh riêng `bundle/<version>/bundle.zip`
 * — `listAppReleases()` chỉ quét `android/` và `ios/` nên hai bên không đụng nhau.
 */

export const BUNDLE_PREFIX = "bundle";
export const BUNDLE_FILE = "bundle.zip";

export type HubBundle = {
  version: string;
  path: string;
  sizeBytes: number;
  notes: string;
  updatedAt: string | null;
};

/**
 * So sánh phiên bản kiểu semver rời rạc (1.2.10 > 1.2.9 — so theo chuỗi thì sai).
 * Trả về >0 nếu a mới hơn b, <0 nếu cũ hơn, 0 nếu bằng.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, "")
      // Bỏ phần hậu tố kiểu "1.0.0-beta.2" — chỉ so phần số.
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Liệt kê mọi bundle OTA đã đẩy lên, mới nhất đứng đầu. */
export async function listHubBundles(): Promise<HubBundle[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  const storage = db.storage.from(APP_RELEASES_BUCKET);
  const { data: versions } = await storage.list(BUNDLE_PREFIX, { limit: 100 });
  if (!versions) return [];

  const bundles: HubBundle[] = [];

  for (const version of versions) {
    // Supabase trả cả "thư mục" (id = null) lẫn file; chỉ thư mục mới là version.
    if (version.id) continue;

    const { data: files } = await storage.list(`${BUNDLE_PREFIX}/${version.name}`, { limit: 10 });
    const file = files?.find((item) => item.id && item.name === BUNDLE_FILE);
    if (!file) continue;

    bundles.push({
      version: version.name,
      path: `${BUNDLE_PREFIX}/${version.name}/${BUNDLE_FILE}`,
      sizeBytes: (file.metadata?.size as number | undefined) ?? 0,
      notes: String((file.metadata?.notes as string | undefined) ?? ""),
      updatedAt: file.updated_at ?? file.created_at ?? null,
    });
  }

  return bundles.sort((a, b) => compareVersions(b.version, a.version));
}

/** Bundle mới nhất, hoặc null nếu chưa đẩy bản nào. */
export async function latestHubBundle(): Promise<HubBundle | null> {
  const bundles = await listHubBundles();
  return bundles[0] ?? null;
}

/**
 * Ký link tải bundle. Plugin tải bằng HTTP thuần (không gắn được header) nên
 * bắt buộc phải là signed URL.
 */
export async function signHubBundle(path: string): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data } = await db.storage.from(APP_RELEASES_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}
