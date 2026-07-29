import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { api } from "@/lib/api";
import { env } from "@/env";
import { isNative } from "@/lib/native";

/**
 * Cập nhật nóng (OTA) bundle web của Arex Hub.
 *
 * App đóng gói sẵn giao diện nên bình thường sửa code là phải cài lại app —
 * trên iOS còn phải ký lại bằng Sideloadly (chứng chỉ Apple ID miễn phí chỉ
 * sống 7 ngày). Plugin @capgo/capacitor-updater cho phép tải bundle mới về rồi
 * thay ruột, người dùng chỉ bấm "Cập nhật".
 *
 * CHỈ thay được JS/CSS/ảnh trong bundle. Đổi code native (thêm plugin, sửa
 * Info.plist, đổi icon…) vẫn phải dựng lại app và cài lại như cũ.
 *
 * Quy trình phía admin:
 *   cd mobile-hub && npm run build && cd ..
 *   node scripts/upload-hub-bundle.mjs --version 1.0.1 --notes "..."
 */

export type BundleUpdate = {
  version: string;
  url: string;
  notes: string;
  sizeBytes: number;
  updatedAt: string | null;
};

type LatestResponse = {
  update: BundleUpdate | null;
  latest?: string | null;
};

/** Plugin đặt tên bundle gốc nằm sẵn trong app là "builtin". */
const BUILTIN = "builtin";

/**
 * Bắt buộc gọi sau khi khung app render xong.
 *
 * Không gọi thì plugin coi như bundle mới làm app chết và tự quay về bản cũ ở
 * lần mở tiếp theo. Đây chính là cái lưới an toàn: bundle lỗi sẽ tự rollback.
 */
export async function notifyUpdaterReady() {
  if (!isNative) return;
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* chạy trên trình duyệt hoặc plugin chưa có — bỏ qua */
  }
}

/** Phiên bản bundle đang chạy. Bản gốc trong app thì lấy theo env.appVersion. */
export async function currentBundleVersion(): Promise<string> {
  if (!isNative) return env.appVersion;
  try {
    const { bundle } = await CapacitorUpdater.current();
    if (!bundle.version || bundle.version === BUILTIN) return env.appVersion;
    return bundle.version;
  } catch {
    return env.appVersion;
  }
}

/** Hỏi server có bundle mới hơn bản đang chạy không. */
export async function checkForBundleUpdate(): Promise<BundleUpdate | null> {
  const current = await currentBundleVersion();
  const data = await api<LatestResponse>(
    `/api/hub/bundle/latest?current=${encodeURIComponent(current)}`,
  );
  return data.update;
}

/**
 * Tải bundle rồi chuyển sang dùng nó.
 *
 * `set()` khởi động lại WebView ngay lập tức, nên đừng viết logic nào sau lời
 * gọi này — nó sẽ không chạy.
 */
export async function applyBundleUpdate(update: BundleUpdate): Promise<void> {
  if (!isNative) {
    throw new Error("Cập nhật nóng chỉ chạy trên app điện thoại.");
  }

  const bundle = await CapacitorUpdater.download({
    url: update.url,
    version: update.version,
  });

  await CapacitorUpdater.set({ id: bundle.id });
}
