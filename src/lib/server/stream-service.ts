import "server-only";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import type { StreamItem, StreamStatus } from "@/lib/types/content";

const STREAMS_KEY = "esports.streams";
const STREAM_CATEGORIES_KEY = "esports.categories";
const DEFAULT_STREAM_CATEGORIES = ["ESPORTS", "GAMING", "CỘNG ĐỒNG"];

function extractYouTubeId(url: string): string {
  const trimmed = url.trim();
  // Already an ID (11 chars, no slash)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // youtu.be/ID
  const short = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com/watch?v=ID or /live/ID or /embed/ID
  const long = trimmed.match(/(?:v=|\/live\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (long) return long[1];
  return trimmed;
}

export function buildThumbnailUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

export function buildWatchUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  return `https://www.youtube.com/watch?v=${id}`;
}

export function buildEmbedUrl(youtubeUrl: string): string {
  const id = extractYouTubeId(youtubeUrl);
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

export { extractYouTubeId };

function parseStreams(raw?: string | null): StreamItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as StreamItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s?.id && s?.youtube_url);
  } catch {
    return [];
  }
}

export async function getStreamCategories(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === STREAM_CATEGORIES_KEY)?.value;
  if (!raw?.trim()) return DEFAULT_STREAM_CATEGORIES;
  const cats = raw.split(/\r?\n|,/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  return cats.length > 0 ? cats : DEFAULT_STREAM_CATEGORIES;
}

export async function saveStreamCategories(categories: string[]): Promise<void> {
  await updateSetting(STREAM_CATEGORIES_KEY, categories.join("\n"));
}

export async function getStreams(): Promise<StreamItem[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === STREAMS_KEY)?.value;
  const streams = parseStreams(raw);
  // Sort: live first, then upcoming, then ended
  const order: Record<StreamStatus, number> = { live: 0, upcoming: 1, ended: 2 };
  return streams.sort((a, b) => {
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
  });
}

export async function createStream(payload: Omit<StreamItem, "id" | "created_at">): Promise<StreamItem> {
  const current = await getStreams();
  const item: StreamItem = {
    ...payload,
    id: crypto.randomUUID(),
    category: payload.category || DEFAULT_STREAM_CATEGORIES[0],
    thumbnail_url: payload.thumbnail_url || buildThumbnailUrl(payload.youtube_url),
    created_at: new Date().toISOString(),
  };
  await updateSetting(STREAMS_KEY, JSON.stringify([...current, item]));
  return item;
}

export async function updateStream(id: string, payload: Partial<Omit<StreamItem, "id" | "created_at">>): Promise<StreamItem> {
  const current = await getStreams();
  const index = current.findIndex((s) => s.id === id);
  if (index < 0) throw new Error("Stream not found.");
  const updated = { ...current[index], ...payload };
  if (payload.youtube_url && !payload.thumbnail_url) {
    updated.thumbnail_url = buildThumbnailUrl(payload.youtube_url);
  }
  current[index] = updated;
  await updateSetting(STREAMS_KEY, JSON.stringify(current));
  return updated;
}

export async function deleteStream(id: string): Promise<void> {
  const current = await getStreams();
  await updateSetting(STREAMS_KEY, JSON.stringify(current.filter((s) => s.id !== id)));
}
