import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import {
  consumeInvitedEmail,
  ensureUserAccount,
  getInvitedEmails,
  getUserByEmail,
  isEmailInvited,
} from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { getClientIp } from "@/lib/server/get-client-ip";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants/admin-domain";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNextPath = requestUrl.searchParams.get("next") ?? "/admin";
  let nextPath = "/admin";

  if (rawNextPath && rawNextPath.startsWith("/") && rawNextPath !== "/") {
    nextPath = rawNextPath;
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const loginRedirectUrl = new URL("/auth/login", requestUrl.origin);

  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  // Password reset link flow: token_hash + type=recovery
  if (tokenHash && (type === "recovery" || type === "email")) {
    const recoveryResponse = NextResponse.redirect(new URL("/auth/update-password", requestUrl.origin));
    const supabaseRecovery = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options) { recoveryResponse.cookies.set({ name, value, ...options }); },
        remove(name: string, options) { recoveryResponse.cookies.set({ name, value: "", ...options }); },
      },
    });
    const { error } = await supabaseRecovery.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "recovery" ? "recovery" : "email",
    });
    if (error) {
      return NextResponse.redirect(new URL("/auth/forgot-password?error=expired", requestUrl.origin));
    }
    return recoveryResponse;
  }

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options) {
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  await supabase.auth.exchangeCodeForSession(code);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedEmail = user?.email?.trim().toLowerCase();
  if (!user || !normalizedEmail) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_user", requestUrl.origin)
    );
  }

  // Password reset flow — skip admin domain check, redirect to update-password
  if (nextPath === "/auth/update-password") {
    return response; // response already redirects to /auth/update-password with session cookies
  }

  if (!normalizedEmail.endsWith(`@${ADMIN_EMAIL_DOMAIN}`)) {
    await supabase.auth.signOut();
    loginRedirectUrl.searchParams.set("error", "google_not_allowed");
    return NextResponse.redirect(loginRedirectUrl);
  }

  const [existingUser, invitedEmails] = await Promise.all([
    getUserByEmail(normalizedEmail),
    getInvitedEmails(),
  ]);

  const isAllowedByInvite = isEmailInvited(normalizedEmail, invitedEmails);
  const isAllowed = Boolean(existingUser || isAllowedByInvite);

  if (!isAllowed) {
    await supabase.auth.signOut();
    loginRedirectUrl.searchParams.set("error", "google_not_allowed");
    return NextResponse.redirect(loginRedirectUrl);
  }

  const ensuredUser = await ensureUserAccount({
    id: user.id,
    email: normalizedEmail,
    role: existingUser?.role ?? "user",
  });

  if (isAllowedByInvite) {
    await consumeInvitedEmail(normalizedEmail);
    if (!existingUser) {
      await logAdminActivity({
        actorEmail: normalizedEmail,
        action: "ADMIN_ACCOUNT_CREATED",
        targetType: "USER",
        targetId: ensuredUser.id,
        summary: `Tạo tài khoản admin bằng Google cho ${ensuredUser.email}`,
      });
    }
  }

  await logAdminActivity({
    actorEmail: normalizedEmail,
    action: "ADMIN_LOGIN_GOOGLE",
    targetType: "AUTH",
    targetId: user.id,
    summary: `Đăng nhập Google thành công với email ${ensuredUser.email}`,
  });

  // Log to login_logs for profile history
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && supabaseUrl) {
    const db = createAdminClient(supabaseUrl, serviceKey);
    const ip = getClientIp(request);
    try {
      await db.from("login_logs").insert({
        user_id: user.id,
        email: normalizedEmail,
        ip: ip !== "unknown" ? ip : null,
        user_agent: request.headers.get("user-agent"),
        method: "google",
      } as never);
    } catch { /* non-fatal */ }
  }

  return response;
}
