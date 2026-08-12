import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { getSettingsByKeys, updateSetting, createAdminActivityLog } from "@/lib/data/content-service";
import { shouldLogVisitor, mergeVisitorEntry, VISITOR_IPS_KEY, type VisitorEntry } from "@/lib/server/visitor-logger";

const VIEWS_KEY = "analytics.views";
const DAILY_KEY = "analytics.daily_views";
const LIFETIME_KEY = "analytics.lifetime_views";
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

  // Chỉ lấy đúng 4 key cần dùng. Trước đây gọi getSettings() → kéo cả bảng
  // settings (kèm blob IP khách vài trăm KB) + giải mã mọi key nhạy cảm, cho MỖI
  // lượt xem trang. Đó là nguồn ngốn Active CPU lớn nhất của dự án.
  const logVisitor = shouldLogVisitor(ip);
  const wanted = [DAILY_KEY, VIEWS_KEY, LIFETIME_KEY];
  if (logVisitor) wanted.push(VISITOR_IPS_KEY);
  const settings = await getSettingsByKeys(wanted);

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

  // Always bump lifetime counter — never resets, never decreases.
  // If lifetime is lower than archived+daily (e.g. just introduced), bootstrap it.
  const lifetimeCurrent = Number(settings.find((s) => s.key === LIFETIME_KEY)?.value ?? 0) || 0;
  const archivedNow = Number(settings.find((s) => s.key === VIEWS_KEY)?.value ?? 0) || 0;
  const newDailyTotal = Object.values(daily).reduce((s, v) => s + (Number(v) || 0), 0);
  const baseline = archivedNow + newDailyTotal;
  const nextLifetime = Math.max(lifetimeCurrent + 1, baseline);

  // Gom mọi lượt ghi vào một Promise.all — trước đây await nối tiếp nhau, mỗi
  // vòng mạng lại giữ máy Fluid sống thêm (tính tiền provisioned memory).
  const writes: Promise<unknown>[] = [
    updateSetting(DAILY_KEY, JSON.stringify(daily)),
    updateSetting(LIFETIME_KEY, String(nextLifetime)),
  ];
  if (archivedDelta > 0) {
    writes.push(updateSetting(VIEWS_KEY, String(archivedNow + archivedDelta)));
  }

  // Log visitor IP (đã lọc qua bộ nhớ đệm 2 phút/IP ở shouldLogVisitor)
  if (logVisitor) {
    const visitorRaw = settings.find((s) => s.key === VISITOR_IPS_KEY)?.value ?? "{}";
    let existing: Record<string, VisitorEntry> = {};
    try { existing = JSON.parse(visitorRaw); } catch { existing = {}; }
    const updated = mergeVisitorEntry(existing, ip, path, ua);
    writes.push(updateSetting(VISITOR_IPS_KEY, JSON.stringify(updated)));

    // Ghi vào nhật ký hoạt động để admin theo dõi
    writes.push(
      createAdminActivityLog({
        actor_email: "visitor@system",
        action: "VISITOR_PAGE_VIEW",
        target_type: "PAGE",
        target_id: null,
        summary: `Khách truy cập ${path} — IP: ${ip}`,
        ip,
      }).catch(() => null),
    );
  }

  await Promise.all(writes);

  return NextResponse.json({ ok: true });
}
