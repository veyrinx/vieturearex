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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNextPath = requestUrl.searchParams.get("next") ?? "/admin";
  let nextPath = "/admin";

  if (rawNextPath && rawNextPath.startsWith("/") && rawNextPath !== "/") {
    nextPath = rawNextPath;
  }

  const code = requestUrl.searchParams.get("code");
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const loginRedirectUrl = new URL("/auth/login", requestUrl.origin);

  if (!code || !hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
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

  if (!normalizedEmail.endsWith("@arex.tech")) {
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

  return response;
}
