import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getTeamRegistrations } from "@/lib/tms/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-team-regs", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = await params;
  const regs = await getTeamRegistrations(id).catch(() => []);
  return NextResponse.json(regs);
}
