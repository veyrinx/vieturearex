import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";
import { isBlockedInMemory, refreshBlockedCache, shouldRefreshCache } from "@/lib/server/ip-blocker";

const PUBLIC_PATHS = [
  "/login", "/register", "/auth/login", "/auth/forgot-password",
  "/auth/update-password", "/auth/verify-otp", "/auth/callback",
  "/auth/register", "/api/user/register", "/api/user/profile",
  "/register", "/api/auth", "/api/contact", "/api/push/subscribe",
  "/api/events", "/api/news", "/api/gallery", "/api/streams",
  "/terms-of-use", "/privacy-policy", "/cookie-policy",
  "/dieu-khoan-su-dung", "/chinh-sach-bao-mat",
  "/maintenance", "/news", "/events", "/calendar",
  "/lich", "/su-kien", "/tin-tuc", "/esports",
  "/search", "/contact", "/lien-he",
];

const AUTH_REQUIRED_PATHS = ["/profile"];
const CRAWLER_ONLY_PATHS = ["/sitemap.xml", "/robots.txt"];
const GOOGLE_BOT_PATTERN =
  /Googlebot|Google-InspectionTool|GoogleOther|AdsBot-Google|Mediapartners-Google|APIs-Google/i;

// Maintenance mode cache (30s TTL — best-effort in serverless)
let maintenanceCache: { on: boolean; expires: number } | null = null;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Sitemap / robots ─────────────────────────────────────────────────
  if (CRAWLER_ONLY_PATHS.includes(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";
    if (!GOOGLE_BOT_PATTERN.test(ua)) return new NextResponse(null, { status: 404 });
    return NextResponse.next();
  }

  const response = await updateSession(request);
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isApiPath = pathname.startsWith("/api/");
  const isPageRequest = !isApiPath && !pathname.startsWith("/_next");

  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    if (isAdminPath) return NextResponse.redirect(new URL("/auth/login", request.url));
    return response;
  }

  // ── IP block check for admin paths ───────────────────────────────────
  if (isAdminPath) {
    const ip = getClientIp(request);

    // Refresh cache from DB periodically
    if (shouldRefreshCache()) {
      try {
        const res = await fetch(new URL("/api/admin/security", request.url), {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
        if (res.ok) {
          const data = (await res.json()) as { blocked: Array<{ ip: string; blockedAt: number; reason: string }> };
          refreshBlockedCache(data.blocked ?? []);
        }
      } catch { /* non-fatal */ }
    }

    if (ip !== "unknown" && isBlockedInMemory(ip)) {
      return new NextResponse(
        `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Bị chặn</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:#fff;margin:0;}
        .box{text-align:center;padding:2rem;max-width:400px;}h1{color:#ef4444;font-size:1.5rem;}p{color:#888;font-size:.9rem;margin-top:.5rem;}</style>
        </head><body><div class="box"><h1>🚫 Truy cập bị từ chối</h1>
        <p>IP của bạn đã bị chặn do quá nhiều lần đăng nhập thất bại.<br>Liên hệ quản trị viên để được hỗ trợ.</p>
        <p style="margin-top:1.5rem;font-size:.75rem;color:#555">IP: ${ip.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] ?? c))}</p></div></body></html>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  if (isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/sw.js") || pathname.startsWith("/fonts")) {
    return response;
  }

  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options) { response.cookies.set({ name, value, ...options }); },
      remove(name: string, options) { response.cookies.set({ name, value: "", ...options }); },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // ── Maintenance mode check ────────────────────────────────────────────
  if (isPageRequest && !isAdminPath && user) {
    const now = Date.now();
    if (!maintenanceCache || now > maintenanceCache.expires) {
      try {
        const { data } = await supabase.from("settings").select("value").eq("key", "site.maintenance_mode").maybeSingle() as { data: { value: string } | null };
        maintenanceCache = { on: data?.value === "true", expires: now + 30_000 };
      } catch { maintenanceCache = { on: false, expires: now + 30_000 }; }
    }
    if (maintenanceCache?.on && pathname !== "/maintenance") {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  if (!user) {
    if (isAdminPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      // Only allow relative paths in next param to prevent open redirect
      if (pathname.startsWith("/") && !pathname.includes("//") && !pathname.includes(":")) {
        redirectUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }
    if (!isApiPath && AUTH_REQUIRED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // ── Profile check (ban + role for admin) ─────────────────────────────
  type UserProfile = { id: string; role: string | null; is_banned: boolean | null };
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role, is_banned")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  // Ban check — all authenticated users
  if (profile?.is_banned) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "banned");
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath) {
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
