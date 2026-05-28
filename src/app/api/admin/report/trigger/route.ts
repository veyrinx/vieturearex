import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { runDailyReport } from "@/lib/server/send-daily-report";

export async function POST(request: NextRequest) {
  void request;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  try {
    const result = await runDailyReport(true);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ ok: false, sent: false, error: String(err) }, { status: 500 });
  }
}
