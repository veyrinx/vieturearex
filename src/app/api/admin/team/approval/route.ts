import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { getSettings } from "@/lib/data/content-service";
import { hasCapability, parseRoleCapabilities } from "@/lib/permissions";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve_it", "approve_admin", "reject"]),
});

type Row = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  team_status: string | null;
  applied_role: string | null;
  application_note: string | null;
  created_at: string;
  avatar_url: string | null;
};

const ADMIN_LEVEL = new Set(["super_admin", "admin"]);
const IT_LEVEL = new Set(["super_admin", "admin", "it"]);

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data, error } = await admin
    .from("users")
    .select("id, email, display_name, role, team_status, applied_role, application_note, game_profiles, phone, created_at, avatar_url")
    .in("team_status", ["pending_it", "pending_admin", "pending"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];
  return NextResponse.json({
    pending_it: rows.filter((r) => r.team_status === "pending_it" || r.team_status === "pending"),
    pending_admin: rows.filter((r) => r.team_status === "pending_admin"),
  });
}

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user: actor } } = await supabase.auth.getUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: actorProfile } = await admin
    .from("users")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle() as { data: { role: string } | null };
  const actorRole = actorProfile?.role ?? "";

  const { data: target } = await admin
    .from("users")
    .select("email, display_name, team_status")
    .eq("id", parsed.data.userId)
    .maybeSingle() as { data: { email: string; display_name: string | null; team_status: string | null } | null };

  if (!target) return NextResponse.json({ error: "Không tìm thấy thành viên." }, { status: 404 });

  const settings = await getSettings();
  const matrix = parseRoleCapabilities(settings.find((s) => s.key === "permissions.role_capabilities")?.value);

  // ── REJECT ──────────────────────────────────────────────────────────────
  if (parsed.data.action === "reject") {
    if (!IT_LEVEL.has(actorRole) || !hasCapability(actorRole, "team.approve_it", matrix)) {
      return NextResponse.json({ error: "Bạn không có quyền từ chối." }, { status: 403 });
    }
    const { error } = await admin
      .from("users")
      .update({ team_status: "rejected", role: "user" } as never)
      .eq("id", parsed.data.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminActivity({
      action: "TEAM_REJECTED",
      targetType: "USER",
      targetId: parsed.data.userId,
      summary: `Từ chối yêu cầu gia nhập team ${target.email}`,
    }).catch(() => {});
    const rejectPayload = {
      title: "❌ TỪ CHỐI YÊU CẦU GIA NHẬP TEAM",
      subtitle: `Thực hiện lúc ${vnNow()} (ICT)`,
      sections: [
        {
          icon: "👤",
          heading: "Thành viên bị từ chối",
          rows: [
            { label: "Tên", value: target.display_name || "—", bold: true },
            { label: "Email", value: target.email, mono: true },
          ],
        },
        {
          icon: "👮",
          heading: "Người thực hiện",
          rows: [
            { label: "Vai trò", value: actorRole },
          ],
        },
      ],
      footer: "👥 Arex Team Monitor",
    };
    void sendTelegramNotification(rejectPayload).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  // ── IT APPROVE — moves pending_it → pending_admin ───────────────────────
  if (parsed.data.action === "approve_it") {
    if (!IT_LEVEL.has(actorRole) || !hasCapability(actorRole, "team.approve_it", matrix)) {
      return NextResponse.json({ error: "Chỉ IT trở lên mới được duyệt vòng 1." }, { status: 403 });
    }
    if (target.team_status !== "pending_it" && target.team_status !== "pending") {
      return NextResponse.json({ error: `Không thể duyệt từ trạng thái ${target.team_status}.` }, { status: 400 });
    }
    const { error } = await admin
      .from("users")
      .update({
        team_status: "pending_admin",
        team_it_approved_by: actor.id,
        team_it_approved_at: new Date().toISOString(),
      } as never)
      .eq("id", parsed.data.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminActivity({
      action: "TEAM_IT_APPROVED",
      targetType: "USER",
      targetId: parsed.data.userId,
      summary: `IT duyệt vòng 1: ${target.email} — chờ admin duyệt cuối`,
    }).catch(() => {});
    const itApprovePayload = {
      title: "🟡 IT ĐÃ DUYỆT VÒNG 1 — CHỜ ADMIN",
      subtitle: `Duyệt lúc ${vnNow()} (ICT)`,
      sections: [
        {
          icon: "👤",
          heading: "Thành viên",
          rows: [
            { label: "Tên", value: target.display_name || "—", bold: true },
            { label: "Email", value: target.email, mono: true },
            { label: "Trạng thái mới", value: "Chờ admin duyệt cuối", status: "warn" as const },
          ],
        },
      ],
      footer: "👥 Arex Team Monitor",
    };
    void sendTelegramNotification(itApprovePayload).catch(() => null);
    return NextResponse.json({ ok: true, next: "pending_admin" });
  }

  // ── ADMIN APPROVE — final approval, sends password reset email ──────────
  if (parsed.data.action === "approve_admin") {
    if (!ADMIN_LEVEL.has(actorRole) || !hasCapability(actorRole, "team.approve_admin", matrix)) {
      return NextResponse.json({ error: "Chỉ admin/super_admin mới được duyệt vòng cuối." }, { status: 403 });
    }
    if (target.team_status !== "pending_admin") {
      return NextResponse.json({ error: `Không thể duyệt từ trạng thái ${target.team_status}.` }, { status: 400 });
    }

    const { error } = await admin
      .from("users")
      .update({
        team_status: "approved",
        team_admin_approved_by: actor.id,
        team_admin_approved_at: new Date().toISOString(),
      } as never)
      .eq("id", parsed.data.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let resetSent = false;
    if (target.email) {
      const { error: linkError } = await admin.auth.resetPasswordForEmail(target.email);
      resetSent = !linkError;
    }

    await logAdminActivity({
      action: "TEAM_APPROVED",
      targetType: "USER",
      targetId: parsed.data.userId,
      summary: `Admin duyệt vòng cuối: ${target.email}${resetSent ? " — đã gửi email đặt mật khẩu" : ""}`,
    }).catch(() => {});
    const adminApprovePayload = {
      title: "✅ THÀNH VIÊN ĐÃ ĐƯỢC DUYỆT CHÍNH THỨC",
      subtitle: `Duyệt lúc ${vnNow()} (ICT)`,
      sections: [
        {
          icon: "🎉",
          heading: "Thành viên mới",
          rows: [
            { label: "Tên", value: target.display_name || "—", bold: true },
            { label: "Email", value: target.email, mono: true },
            { label: "Trạng thái", value: "Đã vào team", status: "ok" as const },
          ],
        },
        {
          icon: "📧",
          heading: "Email thông báo",
          rows: [
            {
              label: "Email đặt mật khẩu",
              value: resetSent ? "Đã gửi thành công" : "Gửi thất bại",
              status: (resetSent ? "ok" : "err") as "ok" | "err",
            },
          ],
        },
      ],
      footer: "👥 Arex Team Monitor",
    };
    void sendTelegramNotification(adminApprovePayload).catch(() => null);
    return NextResponse.json({ ok: true, resetSent });
  }

  return NextResponse.json({ error: "Action không hợp lệ." }, { status: 400 });
}
