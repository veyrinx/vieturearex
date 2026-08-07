import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Ảnh nhạy cảm của chợ (CCCD, ảnh chuyển khoản, ảnh bàn giao acc) nằm ở bucket
 * riêng KHÔNG công khai. Trong DB ta không lưu URL Supabase mà lưu một đường
 * dẫn nội bộ trỏ về `/api/shop/file`, nơi kiểm tra quyền rồi mới cấp link ký
 * sống 60 giây.
 *
 * Cách này giữ nguyên được mọi chỗ đang render `<Image src={url}>` — chúng chỉ
 * thấy một URL bình thường — mà ảnh vẫn không ai đoán link để xem trộm được.
 */

/** Bucket công khai: ảnh tin đăng, ai cũng xem được nên để nguyên. */
export const SHOP_PUBLIC_BUCKET = "shop";
/** Bucket kín: giấy tờ và ảnh bằng chứng. */
export const SHOP_PRIVATE_BUCKET = "shop-private";

const REF_PREFIX = "/api/shop/file?p=";

export function toPrivateRef(path: string): string {
  return `${REF_PREFIX}${encodeURIComponent(path)}`;
}

export function isPrivateRef(value: string): boolean {
  return value.startsWith(REF_PREFIX);
}

/**
 * Lọc giá trị `?p=` (đã được URLSearchParams giải mã sẵn) thành đường dẫn
 * trong bucket. Chặn đi ngược thư mục và đường dẫn tuyệt đối.
 */
export function sanitizePrivatePath(value: string | null | undefined): string | null {
  const path = (value ?? "").trim();
  if (!path || path.length > 400) return null;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return null;
  return path;
}

/** Ảnh hợp lệ để lưu kèm một bước đơn: ref kín, hoặc URL http của bucket công khai. */
export function isAllowedImageRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 500 &&
    (isPrivateRef(value) || value.startsWith("http"))
  );
}

/** Link ký ngắn hạn để trình duyệt tải đúng một lần xem. */
export async function signPrivateFile(path: string, expiresIn = 60): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data, error } = await db.storage
    .from(SHOP_PRIVATE_BUCKET)
    .createSignedUrl(path, expiresIn);
  return error ? null : (data?.signedUrl ?? null);
}
