// Video MXH (TikTok/YouTube) — lưu trong settings key `social.videos` (JSON).
// Quản lý ở /admin/social, hiển thị ở /tiktok. Hàm thuần (client + server).

export const SETTINGS_KEY_SOCIAL = "social.videos";

export type SocialPlatform = "tiktok" | "youtube";

export type SocialVideo = {
  id: string;
  title: string;
  url: string;
  platform: SocialPlatform;
  thumbnail?: string;
  enabled?: boolean;
};

export function parseSocialVideos(raw: string | null | undefined): SocialVideo[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: SocialVideo[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) continue;
    const platform: SocialPlatform = o.platform === "youtube" ? "youtube" : "tiktok";
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : Math.random().toString(36).slice(2),
      title: typeof o.title === "string" ? o.title.trim().slice(0, 120) : "",
      url: url.slice(0, 400),
      platform,
      thumbnail: typeof o.thumbnail === "string" && /^https?:\/\//i.test(o.thumbnail) ? o.thumbnail.slice(0, 400) : undefined,
      enabled: o.enabled !== false,
    });
    if (out.length >= 60) break;
  }
  return out;
}

export function serializeSocialVideos(items: SocialVideo[]): string {
  return JSON.stringify(
    items.map((i) => ({
      id: i.id,
      title: i.title,
      url: i.url,
      platform: i.platform,
      ...(i.thumbnail ? { thumbnail: i.thumbnail } : {}),
      ...(i.enabled === false ? { enabled: false } : {}),
    })),
  );
}
