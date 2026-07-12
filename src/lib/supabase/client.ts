"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { AuthError } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

type BrowserClient = ReturnType<typeof createBrowserClient<Database, "public">>;

let browserClient: BrowserClient | null = null;

// Lỗi do refresh token hỏng/hết hạn (không tìm thấy) — cần dọn session cũ.
function isRefreshError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? "").toLowerCase();
  return msg.includes("refresh token");
}

/**
 * Bọc auth.getUser/getSession để KHÔNG BAO GIỜ throw (tránh unhandled rejection
 * khi component gọi mà không bắt lỗi). Nếu refresh token hỏng thì signOut cục bộ
 * để xoá session cũ, các lần gọi sau trả về null thay vì lỗi lặp lại.
 */
function makeAuthSafe(client: BrowserClient) {
  const auth = client.auth;
  const origGetUser = auth.getUser.bind(auth);
  const origGetSession = auth.getSession.bind(auth);

  const recover = async (e: unknown) => {
    if (isRefreshError(e)) {
      try { await auth.signOut({ scope: "local" }); } catch { /* ignore */ }
    }
  };

  auth.getUser = (async (jwt?: string) => {
    try {
      return await origGetUser(jwt);
    } catch (e) {
      await recover(e);
      return { data: { user: null }, error: e as AuthError };
    }
  }) as typeof auth.getUser;

  auth.getSession = (async () => {
    try {
      return await origGetSession();
    } catch (e) {
      await recover(e);
      return { data: { session: null }, error: e as AuthError };
    }
  }) as typeof auth.getSession;
}

export function createClient() {
  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database, "public">(supabaseUrl, supabaseAnonKey);
    makeAuthSafe(browserClient);
  }

  return browserClient;
}
