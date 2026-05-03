import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTeamMembers, leaveTeam, kickMember } from "@/lib/tms/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const members = await getTmsTeamMembers(id).catch(() => []);
  return NextResponse.json(members);
}

// DELETE /api/tms/teams/[id]/members?user_id=xxx  (kick)
// DELETE /api/tms/teams/[id]/members              (leave self)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id");

  try {
    if (targetUserId && targetUserId !== auth.userId) {
      await kickMember(id, auth.userId, targetUserId);
    } else {
      await leaveTeam(id, auth.userId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
