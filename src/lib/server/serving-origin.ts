import "server-only";

/**
 * Tìm gốc URL THẬT SỰ phục vụ nội dung, bằng cách đi theo chuyển hướng.
 *
 * Vì sao cần: site chạy nhiều tên miền, Vercel chỉ để một tên miền phục vụ trực
 * tiếp còn lại 308 về đó. Trình duyệt đi theo chuyển hướng nên người dùng không
 * thấy gì, nhưng máy gọi máy thì không đi: Telegram `setWebhook`, endpoint
 * Interactions của Discord, webhook Zalo… đăng ký vào một địa chỉ 308 là chết
 * lặng — bên kia vẫn báo "thành công", chỉ có tin nhắn là không bao giờ tới.
 *
 * Dò bằng `/api/health`: route đó luôn GET được và không đụng Supabase.
 *
 * @param candidate gốc URL muốn dùng (thường là SITE_URL)
 * @param fallback  dùng khi chuyển hướng vòng vo — thường là origin của chính
 *                  request đang xử lý, vì nơi đó chắc chắn phục vụ trực tiếp.
 */
export async function resolveServingOrigin(candidate: string, fallback: string): Promise<string> {
  let current = candidate;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(`${current}/api/health`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
    // Không thử được (mạng lỗi) → đừng đoán bừa, giữ nguyên lựa chọn ban đầu.
    if (!res) return candidate;
    if (res.status < 300 || res.status >= 400) return current;
    const loc = res.headers.get("location");
    if (!loc) break;
    try {
      current = new URL(loc, current).origin;
    } catch {
      break;
    }
  }
  return fallback;
}
