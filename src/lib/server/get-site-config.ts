import { headers } from "next/headers";
import { getSiteConfigByHostname } from "@/lib/constants/site";

export async function getSiteConfig() {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  return getSiteConfigByHostname(hostname);
}
