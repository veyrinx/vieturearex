import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants/site";

const BASE = siteConfig.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Googlebot — only public content ──────────────────────────────────
      {
        userAgent: "Googlebot",
        allow: [
          "/", "/news/", "/events",
          "/esports", "/calendar", "/gallery",
          "/wiki", "/wiki/",
          "/contact",
          "/about", "/submit-article",
          "/privacy-policy", "/terms-of-use", "/cookie-policy",
          "/tournaments/",
        ],
        disallow: [
          "/admin", "/admin/",
          "/api/", "/api/admin/", "/api/auth/",
          "/auth/", "/auth/login", "/auth/callback",
          "/login", "/register",
          "/_next/", "/*.map",
          "/profile",
        ],
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/*.map"],
      },
      // ── AdSense: bot phải vào được nội dung để phục vụ + duyệt quảng cáo ──
      {
        userAgent: ["Mediapartners-Google", "AdsBot-Google", "AdsBot-Google-Mobile"],
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/admin/", "/auth/", "/*.map"],
      },
      // ── Bingbot — limited ────────────────────────────────────────────────
      {
        userAgent: "Bingbot",
        allow: ["/", "/news/", "/events", "/esports", "/calendar", "/contact", "/about", "/submit-article", "/privacy-policy", "/terms-of-use"],
        disallow: ["/admin", "/api/", "/auth/", "/login", "/register", "/*.map"],
        crawlDelay: 5,
      },
      // ── Known scrapers: block completely ─────────────────────────────────
      {
        userAgent: [
          "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot",
          "BLEXBot", "MajesticBot", "OpenLinkProfiler",
        ],
        disallow: "/",
      },
      // ── All others: public pages only, no crawl of admin/api/source ──────
      {
        userAgent: "*",
        allow: ["/", "/news/", "/events", "/esports", "/calendar", "/wiki", "/wiki/", "/contact", "/about", "/submit-article", "/privacy-policy", "/terms-of-use", "/cookie-policy", "/tournaments/"],
        disallow: [
          "/admin", "/admin/",
          "/api/", "/api/admin/", "/api/auth/",
          "/auth/", "/auth/login",
          "/login", "/register",
          "/_next/", "/*.map",
          "/profile",
        ],
        crawlDelay: 3,
      },
    ],
    sitemap: [`${BASE}/sitemap.xml`],
    host: BASE,
  };
}
