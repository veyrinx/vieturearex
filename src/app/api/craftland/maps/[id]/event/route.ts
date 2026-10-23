import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import {
  classifySource, detectBot, parseBrowser, parseCountry, parseDevice,
  recordMapEvent, recordRejection, visitorHash,
} from "@/lib/server/craftland-analytics";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["view", "copy_code", "share", "guide_open"]),
  referrer: z.string().max(500).nullable().optional(),
  src: z.string().max(20).nullable().optional(),
});

/**
 * Ghi một sự kiện bản đồ. Luôn trả 202 với `{ counted }` — không báo cho
 * client vì sao bị loại để kẻ bơm số không dò được luật.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ counted: false }, { status: 202 });

  const limited = enforceRateLimit(request, { name: "craftland-event", limit: 40, windowMs: 60_000 });
  if (limited) {
    await recordRejection("rate");
    return limited;
  }

  const bot = detectBot(request);
  if (bot) {
    await recordRejection(bot);
    return NextResponse.json({ counted: false }, { status: 202 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ counted: false }, { status: 202 });

  const ua = request.headers.get("user-agent") ?? "";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const { source, referrerHost, searchQuery } = classifySource(parsed.data.referrer, parsed.data.src, host);
  const auth = await getAuthContext();

  const counted = await recordMapEvent({
    mapId: id,
    type: parsed.data.type,
    visitor: await visitorHash(request),
    actorUserId: auth.userId,
    source,
    referrerHost,
    device: parseDevice(ua),
    browser: parseBrowser(ua),
    country: parseCountry(request),
    searchQuery,
  });

  return NextResponse.json({ counted }, { status: 202 });
}
