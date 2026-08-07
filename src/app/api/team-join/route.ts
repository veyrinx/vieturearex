import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureUserAccount } from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { clientNetInfo } from "@/lib/server/client-net";
import { appendTeamJoinToLarkSheet, appendUserToLarkSheet } from "@/lib/server/lark-sheet";

const optionalUrl = z.string().max(300).optional().default("").transform((v) => v.trim());
const optionalText = (max: number) =>
  z.string().max(max).optional().default("").transform((v) => v.trim());

const schema = z.object({
  token: z.string().min(8).max(120),
  email: z.string().email().max(120),
  display_name: z.string().min(1).max(80),
  phone: optionalText(20),
  applied_role: optionalText(40),
  application_note: optionalText(500),
  facebook_url: optionalUrl,
  instagram_url: optionalUrl,
  tiktok_url: optionalUrl,
  discord_url: optionalUrl,
  zalo_url: optionalUrl,
  game_profiles: z
    .array(
      z.object({
        game: z.string().min(1).max(40),
        custom_label: z.string().max(40).optional(),
        uid: z.string().min(1).max(60),
        nickname: z.string().max(60).optional(),
      }),
    )
    .max(10)
    .optional()
    .default([]),
  accept_terms: z.boolean().refine((v) => v === true, {
    message: "Bạn cần đồng ý với điều khoản team trước khi gửi.",
  }),
});

type InviteRow = {
  id: string;
  token: string;
  used_at: string | null;
  expires_at: string;
  label: string | null;
  max_uses?: number | null;
  uses_count?: number | null;
};

function generateRandomPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "team-join", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  // Verify token
  // Try with multi-use columns; fall back to legacy schema if migration hasn't run yet.
  let invite: InviteRow | null = null;
  {
    const { data, error } = await admin
      .from("team_invites")
      .select("id, token, used_at, expires_at, label, max_uses, uses_count")
      .eq("token", parsed.data.token)
      .maybeSingle();
    if (!error) {
      invite = data as InviteRow | null;
    } else {
      const { data: legacy } = await admin
        .from("team_invites")
        .select("id, token, used_at, expires_at, label")
        .eq("token", parsed.data.token)
        .maybeSingle();
      invite = legacy as InviteRow | null;
    }
  }

  if (!invite) return NextResponse.json({ error: "Mã mời không tồn tại." }, { status: 404 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Mã mời đã hết hạn." }, { status: 410 });
  }
  const maxUses = Number(invite.max_uses ?? 1);
  const usesCount = Number(invite.uses_count ?? (invite.used_at ? 1 : 0));
  if (usesCount >= maxUses) {
    return NextResponse.json({ error: "Mã mời đã hết lượt sử dụng." }, { status: 410 });
  }

  const email = parsed.data.email.toLowerCase();
  const displayName = parsed.data.display_name;

  // Create auth user with random password (IT/super_admin will trigger reset
  // on approval so the user sets their own password via email link).
  const tempPassword = generateRandomPassword();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError) {
    const msg = authError.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "Email này đã được đăng ký. Hãy dùng email khác hoặc liên hệ admin." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUser = authData.user;
  await ensureUserAccount({ id: authUser.id, email, role: "team_member" });

  // Core fields BẮT BUỘC thành công. Nếu fail (vd. constraint users_role_check
  // thiếu 'team_member', hoặc team_status không hợp lệ) → xoá auth user vừa tạo
  // rồi báo lỗi rõ ràng. KHÔNG nuốt lỗi im lặng để hồ sơ mồ côi / không vào hàng chờ.
  const { error: coreErr } = await admin
    .from("users")
    .update({
      role: "team_member",
      team_status: "pending_it",
      display_name: displayName,
      team_terms_accepted_at: new Date().toISOString(),
    } as never)
    .eq("id", authUser.id);
  if (coreErr) {
    await admin.auth.admin.deleteUser(authUser.id).catch(() => {});
    return NextResponse.json(
      {
        error:
          `Không tạo được hồ sơ team: ${coreErr.message}. ` +
          `Có thể DB chưa cho phép role 'team_member' — báo admin chạy migration users_role_check.`,
      },
      { status: 500 },
    );
  }

  // Thông tin phụ — graceful: bỏ qua cột migration chưa tạo (không chặn đăng ký).
  const extras: Record<string, unknown> = {
    phone: parsed.data.phone || null,
    applied_role: parsed.data.applied_role || null,
    application_note: parsed.data.application_note || null,
    facebook_url: parsed.data.facebook_url || null,
    instagram_url: parsed.data.instagram_url || null,
    tiktok_url: parsed.data.tiktok_url || null,
    discord_url: parsed.data.discord_url || null,
    zalo_url: parsed.data.zalo_url || null,
    game_profiles: parsed.data.game_profiles
      .map((g) => ({
        game: g.game.trim(),
        custom_label: g.custom_label?.trim() || undefined,
        uid: g.uid.trim(),
        nickname: g.nickname?.trim() || undefined,
      }))
      .filter((g) => g.game && g.uid),
  };

  const COLUMN_ERR = /column ["']?([a-z0-9_]+)["']? .*does not exist|could not find the ['"]?([a-z0-9_]+)['"]? column/i;
  let attempts = 0;
  let working = { ...extras };
  while (Object.keys(working).length > 0 && attempts < 16) {
    const { error } = await admin.from("users").update(working as never).eq("id", authUser.id);
    if (!error) break;
    const match = COLUMN_ERR.exec(error.message ?? "");
    const missing = match?.[1] ?? match?.[2];
    if (missing && working[missing] !== undefined) {
      delete working[missing];
      attempts += 1;
      continue;
    }
    break;
  }

  // Mark invite consumed — increment uses_count; only mark as fully used when reaching max_uses.
  const newCount = usesCount + 1;
  const consumed = newCount >= maxUses;
  const inviteUpdate: Record<string, unknown> = {
    uses_count: newCount,
    used_by: authUser.id,
  };
  if (consumed) inviteUpdate.used_at = new Date().toISOString();
  // First try with new columns; fall back to legacy schema if cols are missing.
  {
    const { error } = await admin
      .from("team_invites")
      .update(inviteUpdate as never)
      .eq("id", invite.id);
    if (error) {
      await admin
        .from("team_invites")
        .update({
          used_by: authUser.id,
          ...(consumed ? { used_at: new Date().toISOString() } : {}),
        } as never)
        .eq("id", invite.id);
    }
  }

  await logAdminActivity({
    actorEmail: email,
    action: "TEAM_JOIN_REQUEST",
    targetType: "USER",
    targetId: authUser.id,
    summary: `Yêu cầu gia nhập team từ ${email} (${displayName}) — chờ IT duyệt`,
  }).catch(() => {});

  // Notifications (fire and forget)
  const gameStr = parsed.data.game_profiles.length === 0
    ? "—"
    : parsed.data.game_profiles
        .map((g) => `${g.custom_label || g.game}: ${g.uid}${g.nickname ? ` (${g.nickname})` : ""}`)
        .join(" | ");

  const socialRows = [
    { key: "Facebook", val: parsed.data.facebook_url },
    { key: "Instagram", val: parsed.data.instagram_url },
    { key: "TikTok", val: parsed.data.tiktok_url },
    { key: "Discord", val: parsed.data.discord_url },
    { key: "Zalo", val: parsed.data.zalo_url },
  ].filter((s) => s.val).map((s) => ({ label: s.key, value: s.val as string }));

  const joinPayload = {
    title: "🆕 YÊU CẦU GIA NHẬP TEAM",
    subtitle: `${invite.label ? `[${invite.label}] ` : ""}Nộp lúc ${vnNow()} (ICT) — chờ IT duyệt`,
    sections: [
      {
        icon: "👤",
        heading: "Thông tin cá nhân",
        rows: [
          { label: "Họ tên", value: displayName, bold: true },
          { label: "Email", value: email, mono: true },
          { label: "SĐT", value: parsed.data.phone || "—" },
          { label: "Vị trí ứng tuyển", value: parsed.data.applied_role || "—" },
        ],
      },
      ...(parsed.data.application_note ? [{
        icon: "💬",
        heading: "Lời nhắn",
        rows: [{ label: "Nội dung", value: parsed.data.application_note }],
      }] : []),
      ...(parsed.data.game_profiles.length > 0 ? [{
        icon: "🎮",
        heading: "Thông tin game",
        rows: [{ label: "Tài khoản", value: gameStr, mono: true }],
      }] : []),
      ...(socialRows.length > 0 ? [{
        icon: "🌐",
        heading: "Mạng xã hội",
        rows: socialRows,
      }] : []),
      {
        icon: "🔍",
        heading: "Kỹ thuật",
        rows: [{ label: "IP", value: getClientIp(request), mono: true }],
      },
    ],
    footer: "👥 Arex Team Monitor",
  };
  void sendTelegramNotification(joinPayload).catch(() => null);

  // Bảng tính Lark: tab "Gia nhập team" (hồ sơ ứng tuyển) + tab "Đăng ký"
  // (đây cũng là một tài khoản mới, để sổ thành viên không thiếu người).
  const net = clientNetInfo(request);
  void appendTeamJoinToLarkSheet({
    email,
    display_name:     displayName,
    user_id:          authUser.id,
    phone:            parsed.data.phone,
    applied_role:     parsed.data.applied_role,
    application_note: parsed.data.application_note,
    game_profiles:    gameStr,
    facebook_url:     parsed.data.facebook_url,
    instagram_url:    parsed.data.instagram_url,
    tiktok_url:       parsed.data.tiktok_url,
    discord_url:      parsed.data.discord_url,
    zalo_url:         parsed.data.zalo_url,
    invite_token:     parsed.data.token,
    invite_label:     invite.label,
    ip:               net.ip,
    device:           net.device,
    browser:          net.browser,
  });
  void appendUserToLarkSheet({
    email,
    display_name: displayName,
    user_id:      authUser.id,
    role:         "team_member",
    source:       `Mã mời team${invite.label ? ` [${invite.label}]` : ""}`,
    ip:           net.ip,
    device:       net.device,
    browser:      net.browser,
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
