/**
 * Đăng nhập bằng mạng xã hội — cấu hình dùng chung.
 *
 * Hai tầng, đừng lẫn:
 *  1. BẬT TRÊN SUPABASE — nơi quyết định luồng OAuth có chạy hay không. Nằm ở
 *     dự án Supabase, không phải trong repo này. Chỉnh được từ /admin/social-login
 *     nếu có SUPABASE_ACCESS_TOKEN (xem `lib/server/supabase-auth-config.ts`).
 *  2. HIỆN NÚT — nút có xuất hiện ở trang đăng nhập hay không, lưu ở settings
 *     `auth.social_providers`.
 *
 * Tầng 2 mà bật trong khi tầng 1 chưa bật thì người dùng bấm vào là ăn lỗi —
 * đúng chuyện đang xảy ra trước đợt này: nút Google/Facebook nằm sẵn ở /login
 * suốt, mà bên Supabase chưa provider nào được bật.
 */

export const SETTINGS_KEY_SOCIAL_PROVIDERS = "auth.social_providers";

export const SOCIAL_PROVIDERS = ["google", "facebook", "discord"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  discord: "Discord",
};

/** Nơi khai báo ứng dụng OAuth của từng bên. */
export const SOCIAL_PROVIDER_CONSOLE: Record<SocialProvider, { name: string; url: string }> = {
  google: { name: "Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" },
  facebook: { name: "Meta for Developers", url: "https://developers.facebook.com/apps" },
  discord: { name: "Discord Developer Portal", url: "https://discord.com/developers/applications" },
};

export const isSocialProvider = (v: unknown): v is SocialProvider =>
  typeof v === "string" && (SOCIAL_PROVIDERS as readonly string[]).includes(v);

/**
 * Danh sách nút hiện ở trang đăng nhập.
 *
 * Chưa có dòng settings nào thì trả mảng RỖNG chứ không phải "hiện hết": bày
 * nút cho một provider chưa bật là mời người dùng bấm vào một cái lỗi.
 */
export function parseSocialProviders(raw: string | null | undefined): SocialProvider[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return SOCIAL_PROVIDERS.filter((p) => list.includes(p));
  } catch {
    return [];
  }
}

/** URL phải dán vào ô "Authorized redirect URI" bên console của provider. */
export const oauthCallbackUrl = (supabaseUrl: string): string =>
  `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/callback`;
