import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getStreams, updateStream } from "@/lib/server/stream-service";
import { extractYouTubeId } from "@/lib/utils/stream-utils";
import type { StreamStatus } from "@/lib/types/content";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Server-side cache — tránh spam khi nhiều user cùng lúc
let lastSyncAt = 0;
const SYNC_COOLDOWN_MS = 15_000; // 15 giây minimum giữa các lần sync

async function detectYouTubeStatus(videoId: string): Promise<StreamStatus | null> {
  if (!YOUTUBE_API_KEY) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        snippet?: { liveBroadcastContent?: string };
        liveStreamingDetails?: { actualEndTime?: string };
      }>;
    };

    const item = data.items?.[0];
    if (!item) return "ended"; // Video bị xóa

    const liveContent = item.snippet?.liveBroadcastContent;
    if (liveContent === "live") return "live";
    if (liveContent === "upcoming") return "upcoming";
    // "none" = video thường hoặc live đã kết thúc
    if (item.liveStreamingDetails?.actualEndTime) return "ended";
    return null; // Video thường, không phải stream
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 request/phút — đủ cho polling 20s
  const limited = enforceRateLimit(request, { name: "streams-sync", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  // Server-side cooldown — bỏ qua nếu vừa sync xong
  const now = Date.now();
  if (now - lastSyncAt < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ skipped: true, nextSyncIn: Math.ceil((SYNC_COOLDOWN_MS - (now - lastSyncAt)) / 1000) });
  }

  lastSyncAt = now;

  const streams = await getStreams();
  // Chỉ check streams có YouTube URL và chưa kết thúc lâu
  const streamsToCheck = streams.filter((s) => s.youtube_url?.trim());

  if (streamsToCheck.length === 0) {
    return NextResponse.json({ synced: 0, updated: [] });
  }

  // Batch tất cả video IDs vào 1 request YouTube API duy nhất — tiết kiệm quota tối đa
  const videoIds = streamsToCheck
    .map((s) => extractYouTubeId(s.youtube_url))
    .filter((id) => id.length === 11);

  if (videoIds.length === 0) {
    return NextResponse.json({ synced: 0, updated: [] });
  }

  const updates: string[] = [];

  if (YOUTUBE_API_KEY) {
    try {
      // 1 request duy nhất cho tất cả videos — tiết kiệm quota
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{
            id?: string;
            snippet?: { liveBroadcastContent?: string };
            liveStreamingDetails?: { actualEndTime?: string };
          }>;
        };

        const itemMap = new Map(
          (data.items ?? []).map((item) => [item.id, item])
        );

        await Promise.all(
          streamsToCheck.map(async (stream) => {
            const videoId = extractYouTubeId(stream.youtube_url);
            const item = itemMap.get(videoId);

            let detected: StreamStatus | null = null;

            if (!item) {
              detected = "ended"; // Video bị xóa
            } else {
              const liveContent = item.snippet?.liveBroadcastContent;
              if (liveContent === "live") detected = "live";
              else if (liveContent === "upcoming") detected = "upcoming";
              else if (item.liveStreamingDetails?.actualEndTime) detected = "ended";
            }

            if (!detected || detected === stream.status) return;
            await updateStream(stream.id, { status: detected });
            updates.push(stream.id);
          })
        );
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json(
    { synced: updates.length, updated: updates },
    { headers: { "Cache-Control": "no-store" } }
  );
}
