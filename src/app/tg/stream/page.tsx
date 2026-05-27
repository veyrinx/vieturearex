import { getStreams } from "@/lib/server/stream-service";
import { getSettings } from "@/lib/data/content-service";
import { extractYouTubeId } from "@/lib/utils/stream-utils";
import { StreamClient } from "./_client";
import type { StreamItem } from "@/lib/types/content";

type EnrichedStream = StreamItem & { view_count?: number; concurrent_viewers?: number };

async function fetchYouTubeStats(
  streams: StreamItem[],
  apiKey: string,
): Promise<Record<string, { viewCount?: number; concurrentViewers?: number }>> {
  const ids = streams.map((s) => extractYouTubeId(s.youtube_url)).filter(Boolean);
  if (!ids.length) return {};
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${ids.join(",")}&part=statistics,liveStreamingDetails&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      items?: {
        id: string;
        statistics?: { viewCount?: string };
        liveStreamingDetails?: { concurrentViewers?: string };
      }[];
    };
    return Object.fromEntries(
      (data.items ?? []).map((item) => [
        item.id,
        {
          viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : undefined,
          concurrentViewers: item.liveStreamingDetails?.concurrentViewers
            ? Number(item.liveStreamingDetails.concurrentViewers)
            : undefined,
        },
      ]),
    );
  } catch {
    return {};
  }
}

export default async function TgStreamPage() {
  const [streams, settings] = await Promise.all([getStreams(), getSettings()]);
  const apiKey = settings.find((s) => s.key === "streams.youtube_api_key")?.value ?? "";

  let stats: Record<string, { viewCount?: number; concurrentViewers?: number }> = {};
  if (apiKey) {
    stats = await fetchYouTubeStats(streams, apiKey);
  }

  const enriched: EnrichedStream[] = streams.map((s) => {
    const ytId = extractYouTubeId(s.youtube_url);
    const st = stats[ytId];
    return {
      ...s,
      view_count: st?.viewCount,
      concurrent_viewers: st?.concurrentViewers,
    };
  });

  return <StreamClient streams={enriched} />;
}
