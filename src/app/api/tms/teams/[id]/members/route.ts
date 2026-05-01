import { NextResponse } from "next/server";
import { getTmsTeamMembers } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const members = await getTmsTeamMembers(id).catch(() => []);
  return NextResponse.json(members);
}
