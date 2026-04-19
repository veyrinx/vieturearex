import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth/login",
  "/auth/forgot-password",
  "/auth/update-password",
  "/auth/verify-otp",
  "/auth/callback",
  "/auth/register",
  "/api/user/register",
  "/api/auth",
  "/api/contact",
  "/api/push/subscribe",
  "/terms-of-use",
  "/privacy-policy",
  "/dieu-khoan-su-dung",
  "/chinh-sach-bao-mat",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isApiPath = pathname.startsWith("/api/");

  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return response;
  }

  if (isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/sw.js") || pathname.startsWith("/fonts")) {
    return response;
  }

  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isAdminPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (!isApiPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  if (isAdminPath) {
    const { data: profile } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle() as { data: { id: string; role: string | null } | null; error: unknown };

    if (!profile || !profile.role) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "google_not_allowed");
      return NextResponse.redirect(loginUrl);
    }

    const adminRoles = ["super_admin", "admin", "manager", "support", "it"];
    if (!profile.role || !adminRoles.includes(profile.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map)$).*)",
  ],
};
