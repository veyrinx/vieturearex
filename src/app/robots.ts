import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/auth", "/api/auth"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
