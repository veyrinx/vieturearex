import { NextRequest, NextResponse } from "next/server";
import { runAuthReport } from "@/lib/server/send-auth-report";
import { withCron } from "@/lib/server/ops-log";

// Không chiếm cron slot riêng: chạy ké trong /api/cron/daily-report.
// Route này để gọi tay hoặc gắn cron ngoài khi cần.
export const maxDuration = 30;

export const GET = withCron("auth-report", async (request: NextRequest) => {

  const force = request.headers.get("x-force-report") === "1";
  const result = await runAuthReport(force);

  if (!result.ok && result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
});
