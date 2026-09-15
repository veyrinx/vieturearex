"use client";

import { ReactNode, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { callPlugin, isNativeApp, nativePlatform, onPluginEvent } from "@/lib/native/bridge";
import { isArexHost } from "@/lib/constants/site";
import { NativeAppLayout } from "./native-app-layout";

type NativeAppShellProps = {
  children?: ReactNode;
};

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

export function NativeAppShell({ children }: NativeAppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const handleInitialDeepLink = useCallback(async () => {
    if (!isNativeApp()) return;

    const appUrl = await callPlugin<{ url?: string }>("App", "getLaunchUrl");
    if (appUrl?.url) {
      const target = new URL(appUrl.url);
      if (target.protocol === "arex:") {
        const path = `${target.hostname ? `/${target.hostname}` : ""}${target.pathname}`.replace(
          /\/+$/,
          "",
        );
        if (path === "/auth/callback") {
          if (target.searchParams.get("error")) {
            router.push("/login?error=oauth_failed");
            return;
          }
          window.location.assign(`/auth/oauth-callback${target.search}`);
          return;
        }
        router.push(path ? `${path}${target.search}` : "/");
        return;
      }
      if (isArexHost(target.hostname)) {
        router.push(`${target.pathname}${target.search}${target.hash}` || "/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isNativeApp()) return;

    const root = document.documentElement;
    root.dataset.native = "true";
    root.dataset.nativePlatform = nativePlatform();

    void callPlugin("SplashScreen", "hide", { fadeOutDuration: 220 });
    handleInitialDeepLink();

    return () => {
      delete root.dataset.native;
      delete root.dataset.nativePlatform;
    };
  }, [handleInitialDeepLink]);

  useEffect(() => {
    if (!isNativeApp()) return;
    const style = resolvedTheme === "dark" ? "DARK" : "LIGHT";
    void callPlugin("SystemBars", "setStyle", { style });
    void callPlugin("StatusBar", "setStyle", { style });
  }, [resolvedTheme]);

  useEffect(() => {
    if (!isNativeApp() || nativePlatform() !== "android") return;

    let lastBackPress = 0;

    return subscribe<{ canGoBack: boolean }>("App", "backButton", ({ canGoBack }) => {
      const overlay = document.querySelector<HTMLElement>(
        "[data-state='open'][role='dialog'], [data-state='open'][data-radix-popper-content-wrapper]",
      );
      if (overlay) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }

      if (canGoBack && window.history.length > 1) {
        router.back();
        return;
      }

      if (pathRef.current !== "/") {
        router.push("/");
        return;
      }

      const now = Date.now();
      if (now - lastBackPress < 2000) {
        void callPlugin("App", "exitApp");
        return;
      }
      lastBackPress = now;
    });
  }, [router]);

  useEffect(() => {
    if (!isNativeApp()) return;

    return subscribe<{ url: string }>("App", "appUrlOpen", ({ url }) => {
      const target = new URL(url);
      if (target.protocol === "arex:") {
        const path = `${target.hostname ? `/${target.hostname}` : ""}${target.pathname}`.replace(
          /\/+$/,
          "",
        );
        if (path === "/auth/callback") {
          if (target.searchParams.get("error")) {
            router.push("/login?error=oauth_failed");
            return;
          }
          window.location.assign(`/auth/oauth-callback${target.search}`);
          return;
        }
        router.push(path ? `${path}${target.search}` : "/");
        return;
      }
      if (isArexHost(target.hostname)) {
        router.push(`${target.pathname}${target.search}${target.hash}` || "/");
      }
    });
  }, [router]);

  useEffect(() => {
    if (!isNativeApp()) return;

    return subscribe<{ connected: boolean }>("Network", "networkStatusChange", ({ connected }) => {
      if (!connected) {
        window.dispatchEvent(new CustomEvent("native-offline", { detail: { message: "Mất kết nối mạng" } }));
        return;
      }
      window.dispatchEvent(new CustomEvent("native-online", { detail: { message: "Đã kết nối lại" } }));
    });
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    const offs: Array<() => void> = [];
    let cancelled = false;
    let token: string | null = null;

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

    const timer = window.setTimeout(() => void register(), 6000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [router]);

  useEffect(() => {
    if (!isNativeApp()) return;
    void callPlugin<{ version: string; build: string }>("App", "getInfo").then((info) => {
      if (info) document.documentElement.dataset.nativeVersion = `${info.version}+${info.build}`;
    });
  }, []);

  if (!isNativeApp()) {
    return <>{children}</>;
  }

  return <NativeAppLayout>{children}</NativeAppLayout>;
}