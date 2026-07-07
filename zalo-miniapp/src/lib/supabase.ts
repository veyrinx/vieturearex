import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

// Client Supabase chạy trong webview Zalo. Phiên đăng nhập được lưu ở
// localStorage và tự động refresh token, nên người dùng chỉ cần đăng nhập 1 lần.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "arex-zalo-auth",
  },
});

// Lấy access token hiện tại để đính vào header Authorization khi gọi API site.
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
