import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { api } from "@/lib/api";
import { isNative } from "@/lib/native";
import type { NotificationItem } from "@/types";

/**
 * Thông báo không cần Firebase.
 *
 * Thay vì để server đẩy xuống (FCM/APNs), app tự hỏi `/api/notifications` theo
 * chu kỳ rồi hiện local notification cho những mục chưa thấy lần nào.
 *
 * ĐÁNH ĐỔI so với push thật: chỉ chạy khi app đang mở hoặc vừa mở lại. Đóng
 * hẳn app thì không nhận được gì cho tới lần mở kế tiếp — hệ điều hành dừng
 * toàn bộ JS khi app ở nền. Muốn nhận lúc app đóng thì bắt buộc quay lại FCM.
 */

const POLL_MS = 60_000;
const SEEN_KEY = "hub.notify.seen-at";

/** Lần đầu chạy chỉ ghi mốc, không bắn — tránh dội một loạt thông báo cũ. */
async function readSeenAt(): Promise<string | null> {
  const { value } = await Preferences.get({ key: SEEN_KEY }).catch(() => ({ value: null }));
  return value;
}

async function writeSeenAt(value: string) {
  await Preferences.set({ key: SEEN_KEY, value }).catch(() => null);
}

async function ensurePermission(): Promise<boolean> {
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display === "prompt" || permission.display === "prompt-with-rationale") {
      permission = await LocalNotifications.requestPermissions();
    }
    return permission.display === "granted";
  } catch {
    return false;
  }
}

/**
 * ID của local notification phải là số 32-bit. ID thông báo phía server là uuid
 * nên băm về số — trùng ID chỉ khiến thông báo cũ bị thay thế, không sao.
 */
const MAX_INT32 = 2_147_483_647;

function numericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % MAX_INT32;
}

async function fetchLatest(): Promise<NotificationItem[]> {
  try {
    return await api<NotificationItem[]>("/api/notifications");
  } catch {
    // Mất mạng hoặc phiên hết hạn — lần sau thử lại, không làm phiền người dùng.
    return [];
  }
}

async function showNew(items: NotificationItem[], seenAt: string | null) {
  const fresh = items
    .filter((item) => !item.read_at)
    .filter((item) => (seenAt ? item.created_at > seenAt : false))
    .slice(0, 5);

  if (fresh.length === 0) return;

  await LocalNotifications.schedule({
    notifications: fresh.map((item) => ({
      id: numericId(item.id),
      title: item.title,
      body: item.body ?? "",
      extra: { url: item.entity_url ?? "/" },
    })),
  }).catch(() => null);
}

/** Một vòng: lấy danh sách, bắn cái mới, dời mốc đã xem. */
async function pollOnce() {
  const items = await fetchLatest();
  if (items.length === 0) return;

  const seenAt = await readSeenAt();
  await showNew(items, seenAt);

  // items sắp xếp created_at giảm dần nên phần tử đầu là mới nhất.
  const newest = items[0]?.created_at;
  if (newest && (!seenAt || newest > seenAt)) await writeSeenAt(newest);
}

/**
 * Bật vòng lặp thông báo. Trả về hàm dừng để React cleanup khi đăng xuất.
 *
 * @param onOpen  gọi khi người dùng chạm vào thông báo, kèm đường dẫn cần mở.
 */
export function startNotificationPolling(onOpen?: (url: string) => void) {
  if (!isNative) return () => {};

  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const cleanups: (() => void)[] = [];

  void (async () => {
    if (!(await ensurePermission())) return;
    if (stopped) return;

    const tapHandle = await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => {
        const url = (action.notification.extra as { url?: string } | undefined)?.url;
        if (url) onOpen?.(url);
      },
    ).catch(() => null);
    if (tapHandle) cleanups.push(() => void tapHandle.remove());

    // Trong lúc app ở nền JS bị treo, nên quét lại ngay khi quay lại foreground.
    const resumeHandle = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void pollOnce();
    }).catch(() => null);
    if (resumeHandle) cleanups.push(() => void resumeHandle.remove());

    if (stopped) {
      cleanups.forEach((fn) => fn());
      return;
    }

    void pollOnce();
    timer = setInterval(() => void pollOnce(), POLL_MS);
  })();

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    cleanups.forEach((fn) => fn());
  };
}
