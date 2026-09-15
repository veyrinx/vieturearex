"use client";

import { useCallback, useEffect, useState } from "react";
import { callPlugin, isNativeApp } from "@/lib/native/bridge";

type HapticStyle = "LIGHT" | "MEDIUM" | "HEAVY";
type HapticType = "impact" | "notification" | "selection";

interface HapticOptions {
  style?: HapticStyle;
  type?: HapticType;
}

export function useHaptics() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(isNativeApp());
  }, []);

  const haptic = useCallback(
    async (options: HapticOptions = {}) => {
      if (!available) return;

      const { style = "MEDIUM", type = "impact" } = options;

      try {
        await callPlugin("Haptics", type === "impact" ? "impact" : type, {
          style,
        });
      } catch (error) {
        console.debug("Haptic feedback not available:", error);
      }
    },
    [available]
  );

  const light = useCallback(() => haptic({ style: "LIGHT" }), [haptic]);
  const medium = useCallback(() => haptic({ style: "MEDIUM" }), [haptic]);
  const heavy = useCallback(() => haptic({ style: "HEAVY" }), [haptic]);
  const success = useCallback(() => haptic({ type: "notification", style: "HEAVY" }), [haptic]);
  const warning = useCallback(() => haptic({ type: "notification", style: "MEDIUM" }), [haptic]);
  const error = useCallback(() => haptic({ type: "notification", style: "LIGHT" }), [haptic]);
  const selection = useCallback(() => haptic({ type: "selection" }), [haptic]);

  return {
    haptic,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    available,
  };
}

export function createHapticFeedback() {
  let available = false;

  const checkAvailable = () => {
    available = isNativeApp();
  };

  checkAvailable();

  return {
    impact: async (style: HapticStyle = "MEDIUM") => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "impact", { style });
      } catch {}
    },
    notification: async (style: HapticStyle = "MEDIUM") => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "notification", { style });
      } catch {}
    },
    selection: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "selection");
      } catch {}
    },
    light: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "impact", { style: "LIGHT" });
      } catch {}
    },
    medium: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "impact", { style: "MEDIUM" });
      } catch {}
    },
    heavy: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "impact", { style: "HEAVY" });
      } catch {}
    },
    success: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "notification", { style: "HEAVY" });
      } catch {}
    },
    warning: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "notification", { style: "MEDIUM" });
      } catch {}
    },
    error: async () => {
      if (!available) return;
      try {
        await callPlugin("Haptics", "notification", { style: "LIGHT" });
      } catch {}
    },
    refreshAvailable: checkAvailable,
  };
}

export const haptics = createHapticFeedback();