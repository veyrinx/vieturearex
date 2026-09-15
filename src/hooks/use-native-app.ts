"use client";

import { useEffect, useState } from "react";
import { isNativeApp, nativePlatform } from "@/lib/native/bridge";

export function useNativeApp() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsNative(isNativeApp());
    setPlatform(nativePlatform());
  }, []);

  if (!mounted) {
    return { isNative: false, platform: "web" as const, mounted: false };
  }

  return { isNative, platform, mounted };
}

export function useIsNativeApp() {
  const { isNative, mounted } = useNativeApp();
  return { isNative, mounted };
}

export function useNativePlatform() {
  const { platform, mounted } = useNativeApp();
  return { platform, mounted };
}

// Hook to check if a feature should be enabled on current platform
export function useFeatureFlag(feature: string) {
  const { isNative, platform } = useNativeApp();

  // Define features disabled on native app
  const disabledOnNative = [
    "adsense",
    "google-translate",
    "pwa-install",
    "web-share-api",
    "service-worker-registration",
    "analytics-gtag", // use native analytics instead
    "cookie-consent-banner", // handled natively
  ];

  const disabledOnIOS = [
    "web-bluetooth",
    "web-usb",
    "background-sync",
  ];

  const disabledOnAndroid = [
    // Add Android-specific disabled features
  ];

  if (isNative) {
    if (disabledOnNative.includes(feature)) return false;
    if (platform === "ios" && disabledOnIOS.includes(feature)) return false;
    if (platform === "android" && disabledOnAndroid.includes(feature)) return false;
  }

  return true;
}