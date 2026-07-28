import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { env } from "@/env";

/**
 * Trên native, `localStorage` của WebView có thể bị hệ điều hành dọn khi máy
 * thiếu bộ nhớ → user bị đăng xuất ngẫu nhiên. Capacitor Preferences ghi vào
 * SharedPreferences (Android) / UserDefaults (iOS) nên bền hơn hẳn.
 */
const nativeStorage: SupportedStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: Capacitor.isNativePlatform() ? nativeStorage : undefined,
    storageKey: "arex-hub-auth",
    persistSession: true,
    autoRefreshToken: true,
    // App native không có URL callback dạng web — luồng đăng nhập là email/mật khẩu.
    detectSessionInUrl: false,
  },
});

/** Access token hiện tại (đã tự refresh nếu sắp hết hạn), hoặc null. */
export async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
