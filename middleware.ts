import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";
import { isBlockedInMemory, refreshBlockedCache, shouldRefreshCache } from "@/lib/server/ip-blocker";
import { signRedirectCookie, COOKIE_NAME } from "@/lib/server/next-token";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getClientIp } from "@/lib/server/get-client-ip";
import { shouldLogVisitor, mergeVisitorEntry, VISITOR_IPS_KEY, type VisitorEntry } from "@/lib/server/visitor-logger";

// ── Visitor logging ───────────────────────────────────────────────────────────
async function logVisitorIp(ip: string, path: string, ua: string) {
  try {
    const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || !supabaseUrl) return;
    const db = createSupabaseAdmin(supabaseUrl, serviceKey);

    const { data: row } = await db
      .from("settings")
      .select("value")
      .eq("key", VISITOR_IPS_KEY)
      .maybeSingle() as { data: { value: string } | null };

    let existing: Record<string, VisitorEntry> = {};
    try { existing = row?.value ? (JSON.parse(row.value) as Record<string, VisitorEntry>) : {}; } catch { /**/ }

    const updated = mergeVisitorEntry(existing, ip, path, ua);
    const json = JSON.stringify(updated);

    if (row) {
      await db.from("settings").update({ value: json, updated_at: new Date().toISOString() } as never).eq("key", VISITOR_IPS_KEY);
    } else {
      await db.from("settings").insert({ key: VISITOR_IPS_KEY, value: json } as never);
    }
  } catch { /* non-fatal */ }
}

// ── Always accessible without auth (auth flow + legal + maintenance + all API) ──
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth/login",
  "/auth/forgot-password",
  "/auth/update-password",
  "/auth/verify-otp",
  "/auth/callback",
  "/auth/register",
  "/api/",          // All /api/* routes enforce their own auth
  "/maintenance",
  "/terms-of-use",
  "/privacy-policy",
  "/cookie-policy",
  "/dieu-khoan-su-dung",
  "/chinh-sach-bao-mat",
];

// Only sitemap + robots require Googlebot UA
const CRAWLER_ONLY_PATHS = ["/sitemap.xml", "/robots.txt"];
const GOOGLE_BOT_PATTERN =
  /Googlebot|Google-InspectionTool|GoogleOther|AdsBot-Google|Mediapartners-Google|APIs-Google/i;

// Roles that belong in the admin panel, not the public site
const ADMIN_ROLES = ["super_admin", "admin", "it", "manager", "support"] as const;

let maintenanceCache: { on: boolean; expires: number } | null = null;
let whitelistCache: { ips: string[]; expires: number } | null = null;
const WHITELIST_TTL = 30_000;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Sitemap / robots — Googlebot or internal token only ──────────────
  if (CRAWLER_ONLY_PATHS.includes(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";
    const sitemapToken = request.headers.get("x-sitemap-token") ?? "";
    const validToken = sitemapToken.length > 0 && sitemapToken === process.env.SITEMAP_ACCESS_TOKEN;
    if (!GOOGLE_BOT_PATTERN.test(ua) && !validToken) return notFound();
    return NextResponse.next();
  }

  // ── Short-circuit for public paths (login, API, maintenance, etc.) ───
  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/fonts")
  ) {
    return await updateSession(request);
  }

  const response = await updateSession(request);

  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isApiPath = pathname.startsWith("/api/");
  const isPageRequest = !isApiPath && !pathname.startsWith("/_next");

  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    if (isAdminPath) return NextResponse.redirect(new URL("/auth/login", request.url));
    return notFound();
  }

  const ip = getClientIp(request);

  // ── Refresh blocked-IP cache (once per CACHE_TTL window) ─────────────
  if (shouldRefreshCache()) {
    try {
      const res = await fetch(new URL("/api/admin/security", request.url), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          blocked: Array<{ ip: string; blockedAt: number; reason: string }>;
          whitelist?: string[];
        };
        refreshBlockedCache(data.blocked ?? []);
        if (Array.isArray(data.whitelist)) {
          whitelistCache = { ips: data.whitelist, expires: Date.now() + WHITELIST_TTL };
        }
      }
    } catch { /* non-fatal */ }
  }

  // ── Site-wide IP block — applies to ALL pages, not just admin ─────────
  if (ip !== "unknown" && isBlockedInMemory(ip)) {
    const safeIp = ip.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
    return new NextResponse(
      `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Bị chặn</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:#fff;margin:0;}
      .box{text-align:center;padding:2rem;max-width:400px;}h1{color:#ef4444;font-size:1.5rem;}p{color:#888;font-size:.9rem;margin-top:.5rem;}</style>
      </head><body><div class="box"><h1>🚫 Truy cập bị từ chối</h1>
      <p>Địa chỉ IP của bạn đã bị chặn.<br>Liên hệ quản trị viên để được hỗ trợ.</p>
      <p style="margin-top:1.5rem;font-size:.75rem;color:#555">IP: ${safeIp}</p></div></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // ── Visitor IP logging (page requests only, skip API/assets) ──────────
  if (isPageRequest && shouldLogVisitor(ip)) {
    void logVisitorIp(ip, pathname, request.headers.get("user-agent") ?? "");
  }

  // ── Admin path: whitelist + extra checks ─────────────────────────────
  if (isAdminPath) {
    // Refresh whitelist using service-role key (bypasses RLS)
    const now = Date.now();
    if (!whitelistCache || now > whitelistCache.expires) {
      try {
        const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
        const dbClient = serviceKey && supabaseUrl
          ? createSupabaseAdmin(supabaseUrl, serviceKey)
          : null;
        if (dbClient) {
          const { data: wlRow } = await dbClient
            .from("settings")
            .select("value")
            .eq("key", "security.admin_ip_whitelist")
            .maybeSingle() as { data: { value: string } | null };
          const ips: string[] = wlRow?.value ? (JSON.parse(wlRow.value) as string[]) : [];
          whitelistCache = { ips, expires: now + WHITELIST_TTL };
        } else {
          whitelistCache = { ips: [], expires: now + WHITELIST_TTL };
        }
      } catch {
        whitelistCache = { ips: [], expires: now + WHITELIST_TTL };
      }
    }

    // Whitelist check — applies to ALL admin visitors (authenticated or not)
    if (whitelistCache.ips.length > 0 && ip !== "unknown" && !whitelistCache.ips.includes(ip)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Get authenticated user ────────────────────────────────────────────
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options) { response.cookies.set({ name, value, ...options }); },
      remove(name: string, options) { response.cookies.set({ name, value: "", ...options }); },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // ── Unauthenticated ───────────────────────────────────────────────────
  if (!user) {
    if (isAdminPath) {
      // Redirect to admin login with encrypted destination cookie
      const redirect = NextResponse.redirect(new URL("/auth/login", request.url));
      if (pathname.startsWith("/") && !pathname.includes("//") && !pathname.includes(":")) {
        const signed = await signRedirectCookie(pathname);
        redirect.cookies.set(COOKIE_NAME, signed, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 600,
          path: "/",
        });
      }
      return redirect;
    }
    // All other private paths → 404 (stealth — no hint that a login exists)
    return notFound();
  }

  // ── Maintenance mode (authenticated users only) ───────────────────────
  if (isPageRequest && !isAdminPath) {
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

  // ── Get profile (role + ban check) ───────────────────────────────────
  type UserProfile = { id: string; role: string | null; is_banned: boolean | null };
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role, is_banned")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  // Ban check — sign out and redirect to login with error
  if (profile?.is_banned) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "banned");
    return NextResponse.redirect(loginUrl);
  }

  // ── Admin path access control ─────────────────────────────────────────
  if (isAdminPath) {
    if (error || !profile || !profile.role) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "google_not_allowed");
      return NextResponse.redirect(loginUrl);
    }
    if (!(ADMIN_ROLES as readonly string[]).includes(profile.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Block search engine indexing on admin paths
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    return response;
  }

  // ── Public site: admin-role users → redirect to /admin ───────────────
  // Prevents admins from appearing on the public site (protects identity)
  if (profile?.role && (ADMIN_ROLES as readonly string[]).includes(profile.role)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude static assets and source maps
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot)$).*)",
  ],
};
