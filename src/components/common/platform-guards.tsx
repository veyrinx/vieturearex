"use client";

import { ReactNode } from "react";
import { useIsNativeApp, useNativePlatform } from "@/hooks/use-native-app";

interface NativeOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function NativeOnly({ children, fallback = null }: NativeOnlyProps) {
  const { isNative, mounted } = useIsNativeApp();

  if (!mounted) return null;
  if (!isNative) return <>{fallback}</>;

  return <>{children}</>;
}

interface WebOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function WebOnly({ children, fallback = null }: WebOnlyProps) {
  const { isNative, mounted } = useIsNativeApp();

  if (!mounted) return null;
  if (isNative) return <>{fallback}</>;

  return <>{children}</>;
}

interface PlatformOnlyProps {
  children: ReactNode;
  platform: "ios" | "android";
  fallback?: ReactNode;
}

export function PlatformOnly({ children, platform, fallback = null }: PlatformOnlyProps) {
  const { platform: currentPlatform, mounted } = useNativePlatform();

  if (!mounted) return null;
  if (currentPlatform !== platform) return <>{fallback}</>;

  return <>{children}</>;
}

interface NativeHiddenProps {
  children: ReactNode;
}

export function NativeHidden({ children }: NativeHiddenProps) {
  const { isNative, mounted } = useIsNativeApp();

  if (!mounted) return <>{children}</>;
  if (isNative) return null;

  return <>{children}</>;
}

interface WebHiddenProps {
  children: ReactNode;
}

export function WebHidden({ children }: WebHiddenProps) {
  const { isNative, mounted } = useIsNativeApp();

  if (!mounted) return null;
  if (!isNative) return <>{children}</>;

  return null;
}

// CSS class helpers for conditional styling
export const nativeClasses = {
  // Show only on native app
  nativeOnly: "html[data-native='true'] &",
  // Hide on native app
  nativeHidden: "html[data-native='true'] &",
  // Show only on web
  webOnly: "html:not([data-native='true']) &",
  // Hide on web
  webHidden: "html:not([data-native='true']) &",
};