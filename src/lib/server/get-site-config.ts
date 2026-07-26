import { headers } from "next/headers";
import { getSiteConfigByHostname } from "@/lib/constants/site";

export async function getSiteConfig() {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  return getSiteConfigByHostname(hostname);
}

// URL tuyệt đối của trang đang được render — dùng cho canonical / og:url.
// Nguồn duy nhất biết được pathname trong Server Component là header
// x-site-pathname do middleware gắn. Middleware.ts hiện nằm ở root repo trong khi
// app ở src/ nên Next.js KHÔNG biên dịch nó — header không bao giờ tồn tại.
// Vì vậy trả về null khi thiếu header, để layout bỏ hẳn canonical/og:url thay vì
// khai sai thành trang chủ (Google sẽ coi mọi trang là bản trùng của trang chủ).
// Mỗi trang tự khai canonical + openGraph.url của mình. Nếu sau này middleware
// chạy được thì hàm này tự hoạt động trở lại, không cần sửa gì thêm.
export async function getCurrentUrl(): Promise<string | null> {
  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  const site = getSiteConfigByHostname(hostname);
  const pathname = h.get("x-site-pathname");
  if (!pathname) return null;
  return pathname === "/" ? site.url : `${site.url}${pathname}`;
}
