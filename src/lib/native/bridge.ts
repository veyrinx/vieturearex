/**
 * Cầu nối tới vỏ native Capacitor (thư mục `mobile/`).
 *
 * App native nạp thẳng site này trong WebView, và Capacitor tự tiêm
 * `window.Capacitor` vào trang. Nhờ vậy web gọi được plugin native mà KHÔNG
 * cần cài thêm package @capacitor/* vào bundle Next.js — chỉ nói chuyện qua
 * `Capacitor.Plugins`.
 *
 * Mọi hàm ở đây đều an toàn khi chạy trên web thường: không có bridge thì
 * chúng lặng lẽ không làm gì.
 */

export type NativePlatform = "ios" | "android" | "web";

type PluginProxy = Record<string, (...args: unknown[]) => Promise<unknown>> & {
  addListener?: (
    event: string,
    cb: (data: never) => void,
  ) => Promise<{ remove: () => void }> | { remove: () => void };
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, PluginProxy | undefined>;
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

/** Có đang chạy trong vỏ native Arex không (chạy được cả khi SSR). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  // Dự phòng: User-Agent do capacitor.config.ts gắn thêm.
  return /ArexApp\//.test(window.navigator.userAgent);
}

export function nativePlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";
  const p = window.Capacitor?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  if (/ArexIOS/.test(window.navigator.userAgent)) return "ios";
  if (/ArexAndroid/.test(window.navigator.userAgent)) return "android";
  return "web";
}

function plugin(name: string): PluginProxy | undefined {
  if (typeof window === "undefined") return undefined;
  return window.Capacitor?.Plugins?.[name];
}

/** Gọi một method plugin, nuốt lỗi (plugin thiếu / chưa cấp quyền / web thường). */
export async function callPlugin<T = unknown>(
  pluginName: string,
  method: string,
  options?: Record<string, unknown>,
): Promise<T | null> {
  const p = plugin(pluginName);
  const fn = p?.[method];
  if (typeof fn !== "function") return null;
  try {
    return (await fn.call(p, options ?? {})) as T;
  } catch {
    return null;
  }
}

/** Đăng ký listener plugin, trả về hàm huỷ đăng ký (no-op nếu không có bridge). */
export async function onPluginEvent<T>(
  pluginName: string,
  event: string,
  handler: (data: T) => void,
): Promise<() => void> {
  const p = plugin(pluginName);
  if (!p?.addListener) return () => {};
  try {
    const handle = await p.addListener(event, handler as (data: never) => void);
    return () => {
      try {
        handle?.remove?.();
      } catch {
        /* bỏ qua */
      }
    };
  } catch {
    return () => {};
  }
}

// ── Tiện ích hay dùng ───────────────────────────────────────────────────────

/** Mở URL ngoài bằng trình duyệt hệ thống (Custom Tabs / SFSafariViewController). */
export async function openExternal(url: string): Promise<boolean> {
  const opened = await callPlugin("Browser", "open", {
    url,
    presentationStyle: "fullscreen",
    toolbarColor: "#0a0a0a",
  });
  if (opened !== null) return true;
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  return false;
}

/** Đóng tab trình duyệt hệ thống đang mở (nếu có). */
export function closeExternal(): void {
  void callPlugin("Browser", "close");
}

/** Rung phản hồi nhẹ khi chạm — chỉ có tác dụng trên native. */
export function haptic(style: "light" | "medium" | "heavy" = "light"): void {
  void callPlugin("Haptics", "impact", { style: style.toUpperCase() });
}

/**
 * Thông tin máy từ plugin @capacitor/device (chỉ có trong app native).
 * Trả `null` trên web thường hoặc khi app cũ chưa có plugin.
 */
export type NativeDeviceInfo = {
  /** "iPhone14,5" trên iOS, "SM-A155F" trên Android */
  model: string | null;
  manufacturer: string | null;
  operatingSystem: string | null;
  osVersion: string | null;
  /** RAM khả dụng của app (byte) — Android mới có */
  memUsed: number | null;
  isVirtual: boolean;
};

export async function nativeDeviceInfo(): Promise<NativeDeviceInfo | null> {
  const res = await callPlugin<Record<string, unknown>>("Device", "getInfo");
  if (!res) return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    model: str(res.model),
    manufacturer: str(res.manufacturer),
    operatingSystem: str(res.operatingSystem),
    osVersion: str(res.osVersion),
    memUsed: typeof res.memUsed === "number" ? res.memUsed : null,
    isVirtual: res.isVirtual === true,
  };
}

/** Chia sẻ native (share sheet của hệ điều hành). */
export async function nativeShare(data: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  const res = await callPlugin("Share", "share", data);
  return res !== null;
}
