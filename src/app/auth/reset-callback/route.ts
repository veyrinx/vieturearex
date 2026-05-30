import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Dedicated callback for password reset — completely separate from Google OAuth callback
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const updatePasswordUrl = new URL("/auth/update-password", requestUrl.origin);
  const expiredUrl = new URL("/auth/forgot-password?error=expired", requestUrl.origin);

  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return NextResponse.redirect(updatePasswordUrl);
  }

  const response = NextResponse.redirect(updatePasswordUrl);
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) { return request.cookies.get(name)?.value; },
      set(name, value, options) { response.cookies.set({ name, value, ...options }); },
      remove(name, options) { response.cookies.set({ name, value: "", ...options }); },
    },
  });

  // token_hash flow (generateLink / custom SMTP)
  if (tokenHash && (type === "recovery" || type === "email")) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "recovery" ? "recovery" : "email",
    });
    if (error) return NextResponse.redirect(expiredUrl);
    return response;
  }

  // PKCE code flow (Supabase built-in email)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(expiredUrl);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(expiredUrl);
    return response;
  }

  return NextResponse.redirect(expiredUrl);
}
