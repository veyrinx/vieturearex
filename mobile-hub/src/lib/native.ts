import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Keyboard } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Browser } from "@capacitor/browser";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
// Nhập thẳng plugin (không qua lib/updater) để tránh vòng import: updater cần
// `isNative` từ chính file này.
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { env } from "@/env";
import { currentAccessToken } from "@/lib/supabase";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as "ios" | "android" | "web";

/** Gọi plugin nhưng nuốt lỗi — trên trình duyệt thường nhiều plugin không có. */
async function quiet<T>(run: () => Promise<T>): Promise<T | null> {
  if (!isNative) return null;
  try {
    return await run();
  } catch {
    return null;
  }
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  void quiet(() => Haptics.impact({ style: map[style] }));
}

export function hapticResult(kind: "success" | "warning" | "error") {
  const map = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  void quiet(() => Haptics.notification({ type: map[kind] }));
}

/** Chạy một lần lúc khung app đã render xong. */
export async function bootNativeChrome() {
  // Báo cho plugin cập nhật biết bundle chạy được. Không báo thì lần mở sau nó
  // tự quay về bản cũ — đó là lưới an toàn cho bundle OTA lỗi (xem lib/updater.ts).
  await quiet(() => CapacitorUpdater.notifyAppReady());
  await quiet(() => StatusBar.setStyle({ style: Style.Dark }));
  if (platform === "android") {
    await quiet(() => StatusBar.setBackgroundColor({ color: "#070b14" }));
  }
  await quiet(() => Keyboard.setAccessoryBarVisible({ isVisible: true }));
  await quiet(() => SplashScreen.hide({ fadeOutDuration: 220 }));
}

/** Nút Back của Android: có chỗ để lùi thì lùi, hết thì thoát app. */
export function bindAndroidBack(canGoBack: () => boolean, goBack: () => void) {
  if (platform !== "android") return () => {};
  const handle = App.addListener("backButton", () => {
    if (canGoBack()) goBack();
    else void App.exitApp();
  });
  return () => {
    void handle.then((h) => h.remove()).catch(() => null);
  };
}

/** Theo dõi mạng — trả về hàm huỷ đăng ký. */
export function watchNetwork(onChange: (online: boolean) => void) {
  if (!isNative) {
    const update = () => onChange(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }

  void Network.getStatus()
    .then((s) => onChange(s.connected))
    .catch(() => null);
  const handle = Network.addListener("networkStatusChange", (s) => onChange(s.connected));
  return () => {
    void handle.then((h) => h.remove()).catch(() => null);
  };
}

/** Mở link ngoài bằng trình duyệt hệ thống (Custom Tabs / SFSafariViewController). */
export async function openExternal(url: string) {
  const opened = await quiet(() => Browser.open({ url, presentationStyle: "fullscreen" }));
  if (opened === null) window.open(url, "_blank", "noopener,noreferrer");
}

let tokenListenerBound = false;

/** Gửi token FCM về server để gắn vào tài khoản admin đang đăng nhập. */
async function savePushToken(value: string) {
  const accessToken = await currentAccessToken();
  await fetch(`${env.apiBaseUrl}/api/push/native`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ token: value, platform, appVersion: env.appVersion }),
  }).catch(() => null);
}

/**
 * Xin quyền + đăng ký token đẩy cho CẢ iOS lẫn Android.
 *
 * Dùng `@capacitor-firebase/messaging` thay cho `@capacitor/push-notifications`:
 * server gửi thông báo qua FCM (xem src/lib/server/native-push.ts), mà plugin
 * cũ trên iOS chỉ trả token APNs thô — FCM coi là token rác nên iOS không bao
 * giờ nhận được gì. Plugin này nhúng Firebase SDK ở cả hai nền tảng nên token
 * lấy ra luôn là token FCM, một đường gửi duy nhất cho cả hai.
 *
 * Token FCM có thể bị Firebase cấp lại (cài lại app, khôi phục máy, hết hạn),
 * nên nghe luôn `tokenReceived` chứ không chỉ lấy một lần lúc mở app.
 */
export async function registerPush(onError?: (message: string) => void) {
  if (!isNative) return;

  try {
    let permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await FirebaseMessaging.requestPermissions();
    }
    if (permission.receive !== "granted") return;

    // `registerPush()` chạy lại mỗi lần phiên đăng nhập đổi; chỉ gắn listener
    // một lần, nếu không mỗi lần cấp token lại là mấy lời gọi API trùng nhau.
    if (!tokenListenerBound) {
      tokenListenerBound = true;
      await FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
        if (token) void savePushToken(token);
      });
    }

    const { token } = await FirebaseMessaging.getToken();
    if (token) await savePushToken(token);
  } catch (error) {
    // Thiếu GoogleService-Info.plist / google-services.json, hoặc máy không có
    // Google Play services — app vẫn chạy, chỉ là không có thông báo đẩy.
    onError?.(error instanceof Error ? error.message : "Không đăng ký được thông báo đẩy.");
  }
}

/**
 * Chạm vào thông báo đẩy → mở đúng chỗ trong app.
 *
 * Đường dẫn gửi kèm (`data.url`) là của website, Hub có bộ route riêng nên đưa
 * về hộp thông báo; ở đó bấm từng mục sẽ được dẫn tiếp đúng nơi.
 */
export function onPushOpened(handler: (url: string | null) => void) {
  if (!isNative) return () => {};

  let remove: (() => void) | null = null;
  let disposed = false;

  void FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
    const url = (event.notification?.data as { url?: string } | undefined)?.url ?? null;
    handler(url);
  })
    .then((handle) => {
      if (disposed) void handle.remove();
      else remove = () => void handle.remove();
    })
    .catch(() => null);

  return () => {
    disposed = true;
    remove?.();
  };
}
