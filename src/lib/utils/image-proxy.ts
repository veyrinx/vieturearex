const PROXY_HOSTNAMES: string[] = [
  // dl.dir.freefiremobile.com không cần proxy - server cho phép CORS tự do
  // Thêm domain vào đây nếu cần proxy trong tương lai
];

/**
 * Resolve image src - hiện tại trả về URL gốc trực tiếp.
 * Proxy chỉ dùng khi server upstream có hotlink protection thực sự.
 */
export function resolveImageSrc(src?: string | null): string {
  if (!src?.trim()) return "";
  const trimmed = src.trim();
  try {
    const parsed = new URL(trimmed);
    if (PROXY_HOSTNAMES.includes(parsed.hostname)) {
      return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // không phải URL hợp lệ, trả về nguyên
  }
  return trimmed;
}
