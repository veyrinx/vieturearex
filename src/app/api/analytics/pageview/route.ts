import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings, updateSetting } from "@/lib/data/content-service";

const VIEWS_KEY = "analytics.views";

export async function POST(request: NextRequest) {
  // Rate limit nhẹ - 60 lần/phút mỗi IP
  const limited = enforceRateLimit(request, { name: "pageview", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const settings = await getSettings();
  const current = Number(settings.find((s) => s.key === VIEWS_KEY)?.value ?? 0);
  await updateSetting(VIEWS_KEY, String(current + 1));

  return NextResponse.json({ ok: true });
}
