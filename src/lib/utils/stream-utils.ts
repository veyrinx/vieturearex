// Client-safe stream utilities (no server-only imports)

/** Trả về video id, hoặc "" nếu link không phải YouTube (vd: mp4 tự host). */
export function extractYouTubeId(url: string): string {
  const trimmed = (url ?? "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const short = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const long = trimmed.match(/(?:v=|\/live\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (long) return long[1];
  return "";
}

/** "" khi không phải YouTube — đừng ghép URL lạ vào i.ytimg.com (404 ở console). */
export function buildThumbnailUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "";
}

/**
 * Dọn thumbnail đã lưu trong DB: bỏ các URL ghép sai kiểu
 * `i.ytimg.com/vi/https://.../maxresdefault.jpg` (do bản cũ sinh ra).
 */
export function sanitizeThumbnailUrl(thumbnailUrl?: string | null, youtubeUrl?: string | null): string {
  const t = (thumbnailUrl ?? "").trim();
  const broken = /i\.ytimg\.com\/vi\/(https?%3A|https?:)/i.test(t);
  if (t && !broken) return t;
  return youtubeUrl ? buildThumbnailUrl(youtubeUrl) : "";
}

export function buildWatchUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : youtubeUrl;
}

export function buildEmbedUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  if (!id) return youtubeUrl;
  // youtube-nocookie.com = privacy-enhanced, ít tracking, load nhanh hơn
  // vq=hd1080 = force 1080p, enablejsapi = cho phép postMessage control
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&vq=hd1080&origin=${encodeURIComponent("https://arexnetwork.site")}`;
}
