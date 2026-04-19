import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings, updateSetting } from "@/lib/data/content-service";

const VIEWS_KEY = "analytics.views";
const DAILY_KEY = "analytics.daily_views";
const MAX_DAYS = 90;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "pageview", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const settings = await getSettings();

  // Increment global counter
  const current = Number(settings.find((s) => s.key === VIEWS_KEY)?.value ?? 0);
  await updateSetting(VIEWS_KEY, String(current + 1));

  // Update daily counter
  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today = todayKey();
  daily[today] = (daily[today] ?? 0) + 1;

  // Keep only last MAX_DAYS
  const keys = Object.keys(daily).sort().slice(-MAX_DAYS);
  const trimmed: Record<string, number> = {};
  for (const k of keys) trimmed[k] = daily[k];

  await updateSetting(DAILY_KEY, JSON.stringify(trimmed));

  return NextResponse.json({ ok: true });
}
