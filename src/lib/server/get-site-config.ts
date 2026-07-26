import { headers } from "next/headers";
import { getSiteConfigByHostname } from "@/lib/constants/site";

export async function getSiteConfig() {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  return getSiteConfigByHostname(hostname);
}

// URL tuyệt đối của trang đang được render — dùng cho canonical / og:url.
// Middleware gắn x-site-pathname; nếu thiếu thì lùi về trang chủ.
export async function getCurrentUrl() {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  const site = getSiteConfigByHostname(hostname);
  const pathname = h.get("x-site-pathname") ?? "/";
  return pathname === "/" ? site.url : `${site.url}${pathname}`;
}
