import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getSettings, updateSetting, createAdminActivityLog } from "@/lib/data/content-service";
import { shouldLogVisitor, mergeVisitorEntry, VISITOR_IPS_KEY, type VisitorEntry } from "@/lib/server/visitor-logger";

const VIEWS_KEY = "analytics.views";
const DAILY_KEY = "analytics.daily_views";
const MAX_DAYS = 90;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "pageview", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({})) as { path?: string };
  const path = typeof body.path === "string" ? body.path.slice(0, 120) : "/";
  const ua = request.headers.get("user-agent") ?? "";

  const settings = await getSettings();

  // Update daily counter (source of truth for total views)
  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today = todayKey();
  daily[today] = (daily[today] ?? 0) + 1;

  // Trim to last MAX_DAYS — accumulate dropped buckets into archived total so
  // the long-range counter never resets when old days fall out of the window.
  const sortedKeys = Object.keys(daily).sort();
  let archivedDelta = 0;
  if (sortedKeys.length > MAX_DAYS) {
    const droppedKeys = sortedKeys.slice(0, sortedKeys.length - MAX_DAYS);
    for (const k of droppedKeys) {
      archivedDelta += Number(daily[k]) || 0;
      delete daily[k];
    }
  }

  await updateSetting(DAILY_KEY, JSON.stringify(daily));

  if (archivedDelta > 0) {
    const archivedCurrent = Number(settings.find((s) => s.key === VIEWS_KEY)?.value ?? 0);
    await updateSetting(VIEWS_KEY, String(archivedCurrent + archivedDelta));
  }

  // Log visitor IP
  if (shouldLogVisitor(ip)) {
    const visitorRaw = settings.find((s) => s.key === VISITOR_IPS_KEY)?.value ?? "{}";
    let existing: Record<string, VisitorEntry> = {};
    try { existing = JSON.parse(visitorRaw); } catch { existing = {}; }
    const updated = mergeVisitorEntry(existing, ip, path, ua);
    await updateSetting(VISITOR_IPS_KEY, JSON.stringify(updated));

    // Ghi vào nhật ký hoạt động để admin theo dõi
    try {
      await createAdminActivityLog({
        actor_email: "visitor@system",
        action: "VISITOR_PAGE_VIEW",
        target_type: "PAGE",
        target_id: null,
        summary: `Khách truy cập ${path} — IP: ${ip}`,
        ip,
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true });
}
