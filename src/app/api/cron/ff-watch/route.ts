import { NextResponse } from "next/server";
import { runFfWatchSweep } from "@/lib/server/ff-watch";
import { withCron } from "@/lib/server/ops-log";

export const runtime = "nodejs";
// Quét tuần tự nhiều nick qua API HL, mỗi nick ~0.5s. Để riêng một route thay vì
// chạy ké cron khác vì các route kia đặt maxDuration 30s — không đủ.
export const maxDuration = 300;

/** Cron ngày: chụp lại chỉ số các nick đang được theo dõi và báo biến động. */
export const GET = withCron("ff-watch", async () => {
  const result = await runFfWatchSweep();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
});
