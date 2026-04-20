import { NextRequest, NextResponse } from "next/server";
import { getAdminActivityLogs } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-logs",
    limit: 80,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  try {
    const logs = await getAdminActivityLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
