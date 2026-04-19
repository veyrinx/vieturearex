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
  "/api/user/profile",
  "/register",
  "/api/auth",
  "/api/contact",
  "/api/push/subscribe",
  "/api/events",
  "/api/news",
  "/api/gallery",
  "/api/streams",
  "/terms-of-use",
  "/privacy-policy",
  "/cookie-policy",
  "/dieu-khoan-su-dung",
  "/chinh-sach-bao-mat",
  "/maintenance",
  "/news",
  "/events",
  "/calendar",
  "/lich",
  "/su-kien",
  "/tin-tuc",
  "/esports",
  "/search",
  "/contact",
  "/lien-he",
];

// Paths that require authentication even for regular users
const AUTH_REQUIRED_PATHS = ["/profile"];

// Chỉ cho phép Googlebot truy cập sitemap và robots.txt
const CRAWLER_ONLY_PATHS = ["/sitemap.xml", "/robots.txt"];

const GOOGLE_BOT_PATTERN =
  /Googlebot|Google-InspectionTool|GoogleOther|AdsBot-Google|Mediapartners-Google|APIs-Google/i;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Sitemap & robots: chỉ Googlebot được phép ──────────────────────────
  if (CRAWLER_ONLY_PATHS.includes(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";
    if (!GOOGLE_BOT_PATTERN.test(ua)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const response = await updateSession(request);
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

    if (!isApiPath && AUTH_REQUIRED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  }

  if (isAdminPath) {
    type UserProfile = { 
      id: string;
      role: string | null;
    };
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle<UserProfile>();

    if (error || !profile || !profile.role) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "google_not_allowed");
      return NextResponse.redirect(loginUrl);
    }

    const adminRoles = ["super_admin", "admin", "it", "manager", "support"];
    if (!adminRoles.includes(profile.role)) {
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
