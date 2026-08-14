import { headers } from "next/headers";
import { getSiteConfigByHostname, getSiteConfigById, type SiteConfig } from "@/lib/constants/site";

// ── Ghim site theo bản triển khai ────────────────────────────────────────────
// Một project Vercel phục vụ cả arexnetwork.site lẫn iscnetwork.site, nên bình
// thường phải đọc header Host mới biết đang là site nào. Cái giá của việc đó:
// headers() làm MỌI trang phải render động, không trang nào được nằm trong bộ
// nhớ đệm CDN — mọi `export const revalidate` trong app đều vô hiệu, mỗi lượt
// xem là một lần chạy function tính tiền.
//
// Đặt NEXT_PUBLIC_SITE_ID (giá trị "arex" hoặc "isc") thì bản triển khai đó biết
// trước mình phục vụ site nào, khỏi cần hỏi header, và các trang lại được cache
// theo `revalidate` của chính nó.
//
// Cách bật (KHÔNG bật khi một project còn phục vụ nhiều tên miền — hai site sẽ
// ăn nhầm HTML đã cache của nhau vì bộ nhớ đệm ISR đánh theo đường dẫn chứ
// không theo tên miền):
//   1. Tách mỗi tên miền sang một project Vercel riêng, cùng repo này.
//   2. Project của arexnetwork.site đặt NEXT_PUBLIC_SITE_ID=arex.
//      Project của iscnetwork.site  đặt NEXT_PUBLIC_SITE_ID=isc.
//   3. Deploy lại (biến NEXT_PUBLIC_ được nhúng lúc build).
//
// Chưa đặt biến thì mọi thứ chạy y như trước: vẫn đọc header, vẫn render động.
const PINNED_SITE = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_ID?.trim();
  if (!raw) return null;
  const found = getSiteConfigById(raw);
  if (!found) {
    // Gõ sai mã site mà im lặng chạy tiếp thì cả site đổi thương hiệu mà không
    // ai biết. Báo rõ rồi quay về đọc header cho an toàn.
    console.warn(
      `[get-site-config] NEXT_PUBLIC_SITE_ID="${raw}" không khớp site nào; quay về nhận diện theo tên miền.`,
    );
    return null;
  }
  return found;
})();

/** Bản triển khai này có đang bị ghim vào đúng một site không. */
export const isSitePinned = PINNED_SITE !== null;

export async function getSiteConfig(): Promise<SiteConfig> {
  // Ghim rồi thì không đụng vào headers() — đây chính là chỗ quyết định trang
  // được cache hay phải render lại mỗi lượt xem.
  if (PINNED_SITE) return PINNED_SITE;

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
  // Khi đã ghim site: đọc headers() ở đây sẽ kéo cả trang về render động, đúng
  // thứ ta vừa bỏ công loại bỏ. Mà header x-site-pathname vốn không tồn tại nên
  // hàm này đằng nào cũng trả null — bỏ qua luôn cho khỏi mất cache.
  // Sửa được middleware rồi mà vẫn muốn canonical tự động thì phải bỏ ghim,
  // hoặc chuyển canonical sang generateMetadata của từng trang.
  if (PINNED_SITE) return null;

  const h = await headers();
  const hostname = h.get("x-site-hostname") ?? h.get("host") ?? "";
  const site = getSiteConfigByHostname(hostname);
  const pathname = h.get("x-site-pathname");
  if (!pathname) return null;
  return pathname === "/" ? site.url : `${site.url}${pathname}`;
}
