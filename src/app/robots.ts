import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants/site";

const BASE = siteConfig.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Googlebot — full access (tốt nhất cho SEO) ───────────────────────
      {
        userAgent: "Googlebot",
        allow: ["/", "/news/", "/tin-tuc/", "/events", "/su-kien", "/esports", "/calendar", "/lich", "/gallery", "/contact", "/lien-he"],
        disallow: ["/admin", "/api/", "/auth", "/_next/", "/login", "/register"],
      },
      // ── Googlebot Image — cho phép crawl ảnh ─────────────────────────────
      {
        userAgent: "Googlebot-Image",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
      // ── Bingbot ──────────────────────────────────────────────────────────
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth", "/login", "/register"],
        crawlDelay: 2,
      },
      // ── Bot SEO tools (giữ crawl budget) ─────────────────────────────────
      {
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot"],
        disallow: "/",
      },
      // ── Tất cả bot khác ──────────────────────────────────────────────────
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/api/admin/",
          "/auth/",
          "/login",
          "/register",
          "/_next/",
          "/static/",
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: [
      `${BASE}/sitemap.xml`,
    ],
    host: BASE,
  };
}
