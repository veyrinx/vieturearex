import { NextRequest, NextResponse } from "next/server";
import { runAuthReport } from "@/lib/server/send-auth-report";

// Không chiếm cron slot riêng: chạy ké trong /api/cron/daily-report.
// Route này để gọi tay hoặc gắn cron ngoài khi cần.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.headers.get("x-force-report") === "1";
  const result = await runAuthReport(force);

  if (!result.ok && result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
