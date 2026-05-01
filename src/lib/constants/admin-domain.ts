import { siteConfig } from "./site";

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export const ADMIN_EMAIL_DOMAIN: string =
  process.env.ADMIN_EMAIL_DOMAIN ??
  (domainFromUrl(siteConfig.url) || "arexnetwork.site");
