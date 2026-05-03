import { NextResponse } from "next/server";
import { getTeamRegistrations } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const regs = await getTeamRegistrations(id).catch(() => []);
  return NextResponse.json(regs);
}
