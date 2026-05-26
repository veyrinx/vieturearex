import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";
import { mergeEventServers } from "@/lib/constants/event-servers";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "event-servers", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const settings = await getSettings();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const servers = mergeEventServers(
    map["events.custom_servers"],
    map["events.hidden_servers"],
    map["events.server_logos"],
  );
  return NextResponse.json({ servers });
}
