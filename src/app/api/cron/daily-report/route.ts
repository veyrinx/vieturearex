import { NextRequest, NextResponse } from "next/server";
import { runDailyReport } from "@/lib/server/send-daily-report";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.headers.get("x-force-report") === "1";
  const result = await runDailyReport(force);

  if (!result.ok && result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
