// Tiện ích nhỏ cho Telegram WebApp (an toàn khi chạy ngoài Telegram).

type HapticStyle = "light" | "medium" | "heavy" | "soft" | "rigid";

export function haptic(style: HapticStyle = "light") {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    /* ngoài Telegram: bỏ qua */
  }
}

export function selectionHaptic() {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  } catch {
    /* noop */
  }
}

export function notifyHaptic(type: "error" | "success" | "warning" = "success") {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  } catch {
    /* noop */
  }
}
