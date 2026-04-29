import { NextRequest, NextResponse } from "next/server";
import { getSettings, getDashboardStats } from "@/lib/data/content-service";
import { sendLarkNotification } from "@/lib/server/lark-notify";

const DAILY_KEY = "analytics.daily_views";

function vnDateKey(daysAgo = 0) {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 7); // VN time
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  // Authenticate cron caller. Vercel sets CRON_SECRET in Authorization header.
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, settings] = await Promise.all([getDashboardStats(), getSettings()]);
  const enabled = settings.find((s) => s.key === "integrations.lark_daily_report")?.value !== "false";
  if (!enabled) {
    return NextResponse.json({ ok: true, sent: false, reason: "disabled" });
  }
  const dailyRaw = settings.find((s) => s.key === DAILY_KEY)?.value ?? "{}";
  let daily: Record<string, number> = {};
  try { daily = JSON.parse(dailyRaw); } catch { daily = {}; }

  const today = daily[vnDateKey(0)] ?? 0;
  const yesterday = daily[vnDateKey(1)] ?? 0;
  const last7 = Array.from({ length: 7 }, (_, i) => daily[vnDateKey(i)] ?? 0).reduce((a, b) => a + b, 0);
  const trend = today > yesterday ? "📈 tăng" : today < yesterday ? "📉 giảm" : "➖ bằng";

  const result = await sendLarkNotification({
    title: `📊 Báo cáo ngày — ${vnDateKey(0)}`,
    lines: [
      { label: "Lượt xem hôm nay", value: today.toLocaleString("vi-VN") },
      { label: "Hôm qua", value: `${yesterday.toLocaleString("vi-VN")} (${trend})` },
      { label: "7 ngày gần nhất", value: last7.toLocaleString("vi-VN") },
      { label: "Tổng lượt xem (tích luỹ)", value: stats.views.toLocaleString("vi-VN") },
      { label: "Tổng người dùng", value: stats.users.toLocaleString("vi-VN") },
      { label: "Sự kiện", value: stats.events.toLocaleString("vi-VN") },
      { label: "Bài viết", value: stats.news.toLocaleString("vi-VN") },
    ],
  });

  return NextResponse.json({ ok: true, sent: result.sent, today, yesterday, last7 });
}
