import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTeamMembers, leaveTeam, kickMember, getTmsTeam } from "@/lib/tms/data";
import { createNotification } from "@/lib/server/notifications";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-team-members", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const members = await getTmsTeamMembers(id).catch(() => []);
  return NextResponse.json(members);
}

// DELETE /api/tms/teams/[id]/members?user_id=xxx  (kick)
// DELETE /api/tms/teams/[id]/members              (leave self)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id");

  try {
    const isKick = !!(targetUserId && targetUserId !== auth.userId);

    if (isKick) {
      await kickMember(id, auth.userId, targetUserId!);

      const team = await getTmsTeam(id).catch(() => null);
      const teamLabel = team ? `[${team.tag}] ${team.name}` : `Team ${id}`;

      void createNotification({
        user_id: targetUserId!,
        type: "system",
        title: "Bạn đã bị kick khỏi team",
        body: `Bạn đã bị xóa khỏi ${teamLabel}`,
        entity_type: "team",
        entity_id: id,
      }).catch(() => null);

      void sendTelegramNotification({
        title: "👢 KICK THÀNH VIÊN",
        subtitle: vnNow(),
        sections: [{ rows: [
          { label: "Team", value: teamLabel, bold: true },
          { label: "User bị kick", value: targetUserId!, mono: true },
        ]}],
        footer: "🏆 Arex TMS",
      }).catch(() => null);
    } else {
      await leaveTeam(id, auth.userId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
