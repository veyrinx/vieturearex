import { NextResponse } from "next/server";
import { runBxhRankNotify } from "@/lib/server/bxh-rank-notify";
import { withCron } from "@/lib/server/ops-log";

// Cron 08:00 VN. Nhịp 20:00 VN chạy ké trong /api/cron/checkin-reminder vì plan
// Hobby chỉ cho mỗi cron chạy 1 lần/ngày.
export const maxDuration = 30;

export const GET = withCron("bxh-rank-notify", async () => {

  const result = await runBxhRankNotify();
  if (!result.ok) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  return NextResponse.json(result);
});
