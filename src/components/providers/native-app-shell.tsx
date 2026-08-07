"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  callPlugin,
  closeExternal,
  isNativeApp,
  nativePlatform,
  onPluginEvent,
  openExternal,
} from "@/lib/native/bridge";

/**
 * Đăng ký listener plugin an toàn với vòng đời effect: nếu effect bị huỷ trước
 * khi promise đăng ký xong thì gỡ luôn, tránh rò listener.
 */
function subscribe<T>(
  pluginName: string,
  event: string,
  handler: (data: T) => void,
): () => void {
  let off: (() => void) | null = null;
  let disposed = false;

  void onPluginEvent<T>(pluginName, event, handler).then((remove) => {
    if (disposed) remove();
    else off = remove;
  });

  return () => {
    disposed = true;
    off?.();
  };
}

/**
 * Lớp "native" cho app iOS/Android (vỏ Capacitor ở thư mục `mobile/`).
 *
 * Giao diện vẫn là web y hệt; component này chỉ nối các hành vi hệ điều hành:
 * ẩn splash, đồng bộ màu thanh trạng thái theo theme, nút back Android,
 * deep link, mở link ngoài bằng trình duyệt hệ thống, thông báo đẩy, offline.
 *
 * Trên web thường mọi thứ đều là no-op.
 */
export function NativeAppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // pathname mới nhất cho các listener chỉ đăng ký một lần.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // ── Đánh dấu môi trường native + ẩn splash ────────────────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;

    const root = document.documentElement;
    root.dataset.native = "true";
    root.dataset.nativePlatform = nativePlatform();

    // Site đã render → tắt splash.
    void callPlugin("SplashScreen", "hide", { fadeOutDuration: 220 });

    return () => {
      delete root.dataset.native;
      delete root.dataset.nativePlatform;
    };
  }, []);

  // ── Thanh trạng thái đổi màu chữ theo theme sáng/tối ──────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;
    // DARK = nền tối, chữ trắng. LIGHT = nền sáng, chữ đen.
    const style = resolvedTheme === "dark" ? "DARK" : "LIGHT";
    void callPlugin("SystemBars", "setStyle", { style });
    void callPlugin("StatusBar", "setStyle", { style }); // vỏ cũ / iOS
  }, [resolvedTheme]);

  // ── Nút back cứng của Android ─────────────────────────────────────────────
  useEffect(() => {
    if (!isNativeApp() || nativePlatform() !== "android") return;

    let lastBackPress = 0;

    return subscribe<{ canGoBack: boolean }>("App", "backButton", ({ canGoBack }) => {
      // 1. Có lớp phủ đang mở (sheet, dialog, menu) → đóng bằng phím Escape.
      const overlay = document.querySelector<HTMLElement>(
        "[data-state='open'][role='dialog'], [data-state='open'][data-radix-popper-content-wrapper]",
      );
      if (overlay) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      // 2. Còn lịch sử → lùi một bước.
      if (canGoBack && window.history.length > 1) {
        router.back();
        return;
      }

      // 3. Không ở trang chủ → về trang chủ.
      if (pathRef.current !== "/") {
        router.push("/");
        return;
      }

      // 4. Ở trang chủ → bấm back 2 lần trong 2 giây để thoát.
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        void callPlugin("App", "exitApp");
        return;
      }
      lastBackPress = now;
      toast("Nhấn back lần nữa để thoát", { duration: 1800 });
    });
  }, [router]);

  // ── Deep link (App Links / Universal Links / arex://) ─────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;

    return subscribe<{ url: string }>("App", "appUrlOpen", ({ url }) => {
      closeExternal(); // đóng tab trình duyệt hệ thống nếu đang mở (luồng OAuth)

      let target: URL;
      try {
        target = new URL(url);
      } catch {
        return;
      }

      // arex://path?query  →  /path?query
      if (target.protocol === "arex:") {
        const path = `${target.hostname ? `/${target.hostname}` : ""}${target.pathname}`.replace(
          /\/+$/,
          "",
        );

        // Quay về từ luồng OAuth mở ở trình duyệt hệ thống: đổi code ngay TRONG
        // WebView, vì code_verifier (PKCE) nằm ở cookie của WebView.
        if (path === "/auth/callback") {
          if (target.searchParams.get("error")) {
            router.push("/login?error=oauth_failed");
            return;
          }
          // Điều hướng cứng: /auth/oauth-callback là route handler (redirect +
          // set cookie), không đi qua client router của Next được.
          window.location.assign(`/auth/oauth-callback${target.search}`);
          return;
        }

        router.push(path ? `${path}${target.search}` : "/");
        return;
      }

      if (target.hostname.endsWith("arexnetwork.site")) {
        router.push(`${target.pathname}${target.search}${target.hash}` || "/");
      }
    });
  }, [router]);

  // ── Link ra ngoài → mở bằng trình duyệt hệ thống ──────────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // Giao thức đặc biệt (mailto:, tel:, zalo:, …) để hệ điều hành tự xử lý.
      if (/^(mailto|tel|sms|intent|market|zalo|fb|tg):/i.test(href)) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;

      const isInternal =
        url.hostname === window.location.hostname ||
        url.hostname.endsWith("arexnetwork.site");
      if (isInternal && anchor.target !== "_blank") return;

      event.preventDefault();
      void openExternal(url.toString());
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // ── Trạng thái mạng ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;
    let offlineToast: string | number | undefined;

    return subscribe<{ connected: boolean }>("Network", "networkStatusChange", ({ connected }) => {
      if (!connected) {
        offlineToast = toast.error("Mất kết nối mạng", {
          description: "Một số nội dung có thể không tải được.",
          duration: Infinity,
        });
        return;
      }
      if (offlineToast !== undefined) {
        toast.dismiss(offlineToast);
        offlineToast = undefined;
        toast.success("Đã kết nối lại");
      }
    });
  }, []);

  // ── Thông báo đẩy ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;
    const offs: Array<() => void> = [];
    let cancelled = false;
    let token: string | null = null;

    /**
     * Gửi token lên server. Gọi lại mỗi lần app quay ra tiền cảnh vì token chỉ
     * cấp một lần lúc mở app: ai đăng nhập sau đó sẽ có token treo lơ lửng
     * không gắn tài khoản, và thông báo riêng (đơn hàng của chợ) không tới được.
     */
    const postToken = (value: string) => {
      void fetch("/api/push/native", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: value,
          platform: nativePlatform(),
          appVersion: document.documentElement.dataset.nativeVersion,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    const register = async () => {
      const perm = await callPlugin<{ receive: string }>(
        "PushNotifications",
        "checkPermissions",
      );
      if (!perm) return;

      let status = perm.receive;
      if (status === "prompt" || status === "prompt-with-rationale") {
        const asked = await callPlugin<{ receive: string }>(
          "PushNotifications",
          "requestPermissions",
        );
        status = asked?.receive ?? "denied";
      }
      if (status !== "granted" || cancelled) return;

      offs.push(
        subscribe<{ value: string }>("PushNotifications", "registration", ({ value }) => {
          token = value;
          postToken(value);
        }),
      );

      offs.push(
        subscribe<{ isActive: boolean }>("App", "appStateChange", ({ isActive }) => {
          if (isActive && token) postToken(token);
        }),
      );

      offs.push(
        subscribe<{ notification?: { data?: { url?: string } } }>(
          "PushNotifications",
          "pushNotificationActionPerformed",
          (event) => {
            const url = event?.notification?.data?.url;
            if (typeof url === "string" && url.startsWith("/")) router.push(url);
          },
        ),
      );

      await callPlugin("PushNotifications", "register");
    };

    // Hoãn vài giây để hộp thoại xin quyền không đập vào mặt ngay khi mở app.
    const timer = window.setTimeout(() => void register(), 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [router]);

  // ── Thông tin phiên bản app cho phần hỗ trợ ───────────────────────────────
  useEffect(() => {
    if (!isNativeApp()) return;
    void callPlugin<{ version: string; build: string }>("App", "getInfo").then((info) => {
      if (info) document.documentElement.dataset.nativeVersion = `${info.version}+${info.build}`;
    });
  }, []);

  return null;
}
