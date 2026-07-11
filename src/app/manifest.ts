import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/constants/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arex Network — Cộng đồng Free Fire Việt Nam",
    short_name: "Arex Network",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "vi",
    dir: "ltr",
    categories: ["news", "games", "sports", "entertainment"],
    icons: [
      { src: siteConfig.sidebarIcon, sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: siteConfig.sidebarIcon, sizes: "512x512", type: "image/jpeg", purpose: "any" },
      { src: siteConfig.sidebarIcon, sizes: "512x512", type: "image/jpeg", purpose: "maskable" },
    ],
  };
}
