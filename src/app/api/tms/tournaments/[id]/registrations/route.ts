import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  getTmsRegistrations, registerTeam, updateRegistrationStatus,
  getTmsTournamentById, getTmsTeam,
} from "@/lib/tms/data";
import { createNotification } from "@/lib/server/notifications";
import { siteConfig } from "@/lib/constants/site";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

async function sendRegistrationEmail(to: string, teamTag: string, teamName: string, tournamentName: string, tournamentSlug: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return;
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
    const tournamentUrl = `${siteConfig.url}/tournaments/${tournamentSlug}`;
    await transporter.sendMail({
      from: `"Arex TMS" <${gmailUser}>`,
      to,
      subject: `[Arex] Đăng ký giải đấu ${tournamentName} — Chờ duyệt`,
      html: `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#0052ff 0%,#003acc 100%);padding:32px 36px;">
<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.6);text-transform:uppercase;">AREX TMS</p>
<h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;letter-spacing:0.04em;text-transform:uppercase;">Đăng Ký Thành Công</h1>
</td></tr>
<tr><td style="padding:32px 36px;">
<p style="margin:0 0 16px;font-size:15px;color:#e8e8f0;">Team <strong>[${teamTag}] ${teamName}</strong> đã đăng ký tham dự giải đấu <strong>${tournamentName}</strong>.</p>
<p style="margin:0 0 24px;font-size:14px;color:#9999b0;line-height:1.6;">Đăng ký đang chờ admin xét duyệt. Bạn sẽ nhận được thông báo qua ứng dụng khi được duyệt hoặc từ chối.</p>
<a href="${tournamentUrl}" style="display:inline-block;background:#0052ff;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;letter-spacing:0.06em;">XEM GIẢI ĐẤU</a>
</td></tr>
<tr><td style="background:#0d0d16;border-top:1px solid #1e1e2e;padding:20px 36px;">
<p style="margin:0;font-size:11px;color:#4a4a6a;text-align:center;">© ${new Date().getFullYear()} AREX · <a href="${siteConfig.url}" style="color:#0052ff;text-decoration:none;">${siteConfig.url}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
    });
  } catch { /* non-fatal */ }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, { name: "tms-registrations", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const regs = await getTmsRegistrations(id).catch(() => []);
  return NextResponse.json(regs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { team_id } = (await req.json().catch(() => ({}))) as { team_id?: string };
  if (!team_id) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: teamRow } = await untypedFrom(db, "tms_teams")
    .select("captain_id, name, tag")
    .eq("id", team_id)
    .single() as { data: { captain_id: string; name: string; tag: string } | null };
  if (!teamRow || teamRow.captain_id !== auth.userId)
    return NextResponse.json({ error: "Chỉ captain mới được đăng ký." }, { status: 403 });

  const { data: tournamentRow } = await untypedFrom(db, "tms_tournaments")
    .select("id, name, slug, status, max_teams, auto_approve_registrations")
    .eq("id", tournamentId)
    .single() as { data: { id: string; name: string; slug: string; status: string; max_teams: number; auto_approve_registrations: boolean } | null };

  if (!tournamentRow) return NextResponse.json({ error: "Không tìm thấy giải đấu." }, { status: 404 });
  if (tournamentRow.status !== "registering" && tournamentRow.status !== "ongoing") {
    return NextResponse.json({ error: "Giải đấu không trong giai đoạn đăng ký." }, { status: 400 });
  }

  try {
    const reg = await registerTeam(tournamentId, team_id);

    // Fetch captain email for confirmation
    const { data: captainUser } = await untypedFrom(db, "users")
      .select("email")
      .eq("id", auth.userId)
      .single() as { data: { email: string } | null };

    // Notify admin on Telegram about new registration (non-blocking)
    void sendTelegramNotification({
      title: "📋 ĐĂNG KÝ GIẢI MỚI",
      subtitle: `Lúc ${vnNow()} (ICT)`,
      sections: [{
        rows: [
          { label: "🏆 Giải đấu", value: tournamentRow.name, bold: true },
          { label: "🏅 Team", value: `[${teamRow.tag}] ${teamRow.name}` },
          { label: "Trạng thái", value: "⏳ Chờ duyệt" },
        ],
      }],
      actions: [{ label: "👉 Quản lý đăng ký", url: `${siteConfig.url}/tournaments/${tournamentRow.slug}` }],
      footer: "🏆 Arex TMS",
    }).catch(() => null);

    // Auto-approve if tournament has setting enabled
    if (tournamentRow.auto_approve_registrations) {
      await updateRegistrationStatus(reg.id, "approved");
      await createNotification({
        user_id: auth.userId,
        type: "registration_approved",
        title: "Đăng ký được duyệt tự động!",
        body: `[${teamRow.tag}] ${teamRow.name} đã được chấp nhận vào ${tournamentRow.name}`,
        entity_type: "tournament",
        entity_id: tournamentId,
        entity_url: `/tournaments/${tournamentRow.slug}`,
      });
      if (captainUser?.email) {
        void sendRegistrationEmail(captainUser.email, teamRow.tag, teamRow.name, tournamentRow.name, tournamentRow.slug);
      }
      return NextResponse.json({ ...reg, status: "approved" }, { status: 201 });
    }

    if (captainUser?.email) {
      void sendRegistrationEmail(captainUser.email, teamRow.tag, teamRow.name, tournamentRow.name, tournamentRow.slug);
    }
    return NextResponse.json(reg, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const { reg_id, status, group_label } = (await req.json().catch(() => ({}))) as {
    reg_id: string; status: "approved" | "rejected"; group_label?: string;
  };

  try {
    await updateRegistrationStatus(reg_id, status, group_label);

    // Fetch reg details to notify team captain
    const db = createAdminSupabaseClient();
    if (db) {
      const { data: reg } = await untypedFrom(db, "tms_registrations")
        .select("team_id, tournament_id")
        .eq("id", reg_id)
        .single() as { data: { team_id: string; tournament_id: string } | null };

      if (reg) {
        const [team, tournament] = await Promise.all([
          getTmsTeam(reg.team_id).catch(() => null),
          getTmsTournamentById(reg.tournament_id).catch(() => null),
        ]);
        if (team && tournament) {
          await createNotification({
            user_id: team.captain_id,
            type: status === "approved" ? "registration_approved" : "registration_rejected",
            title: status === "approved" ? "Đăng ký được duyệt! 🎉" : "Đăng ký bị từ chối",
            body: `[${team.tag}] ${team.name} trong giải ${tournament.name}`,
            entity_type: "tournament",
            entity_id: tournament.id,
            entity_url: `/tournaments/${tournament.slug}`,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
