import { NextResponse } from "next/server";
import { checkAndAlertServerStatus } from "@/lib/server/bot-health";
import { withCron } from "@/lib/server/ops-log";

/**
 * Giám sát server mỗi 5 phút: sập/quá tải (kể cả nghi DDoS) thì nhắn ngay cho
 * admin qua Telegram + Zalo, hồi phục thì báo lại. Chỉ nhắn khi đổi trạng thái
 * (giãn cách tối thiểu 15 phút) nên không spam nhóm admin.
 *
 * Lịch `*\/5 * * * *` trong vercel.json. Gói Hobby chỉ chạy cron 1 lần/ngày —
 * lúc đó job này thành "điểm danh sức khoẻ hằng ngày", vẫn có ích.
 */
export const dynamic = "force-dynamic";

export const GET = withCron("server-watch", async () => {
  const result = await checkAndAlertServerStatus();
  return NextResponse.json({
    ok: result.ok,
    state: result.state,
    changed: result.changed,
    alerted: result.alerted,
    latencyMs: result.health.latencyMs,
    dbLatencyMs: result.health.dbLatencyMs,
    reason: result.health.reason,
  });
});
