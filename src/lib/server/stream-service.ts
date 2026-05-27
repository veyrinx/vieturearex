import "server-only";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import type { StreamItem, StreamStatus } from "@/lib/types/content";
import { extractYouTubeId, buildThumbnailUrl, buildWatchUrl, buildEmbedUrl } from "@/lib/utils/stream-utils";

export { extractYouTubeId, buildThumbnailUrl, buildWatchUrl, buildEmbedUrl };

const STREAMS_KEY = "esports.streams";
const STREAM_CATEGORIES_KEY = "esports.categories";
const DEFAULT_STREAM_CATEGORIES = ["ESPORTS", "GAMING", "CỘNG ĐỒNG"];

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
