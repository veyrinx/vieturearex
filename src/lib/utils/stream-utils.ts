// Client-safe stream utilities (no server-only imports)

export function extractYouTubeId(url: string): string {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const short = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const long = trimmed.match(/(?:v=|\/live\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (long) return long[1];
  return trimmed;
}

export function buildThumbnailUrl(youtubeUrl: string): string {
  return `https://i.ytimg.com/vi/${extractYouTubeId(youtubeUrl)}/maxresdefault.jpg`;
}

export function buildWatchUrl(youtubeUrl: string): string {
  return `https://www.youtube.com/watch?v=${extractYouTubeId(youtubeUrl)}`;
}

export function buildEmbedUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  // youtube-nocookie.com = privacy-enhanced, ít tracking, load nhanh hơn
  // vq=hd1080 = force 1080p, enablejsapi = cho phép postMessage control
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&vq=hd1080&origin=${encodeURIComponent("https://sgmnetwork.vercel.app")}`;
}
