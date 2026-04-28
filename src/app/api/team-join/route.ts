import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureUserAccount } from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendLarkNotification } from "@/lib/server/lark-notify";

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

  // Save extra info — graceful: drop columns the migration may not have created yet.
  const updates: Record<string, unknown> = {
    role: "team_member",
    team_status: "pending_it",
    team_terms_accepted_at: new Date().toISOString(),
    display_name: displayName,
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
  const REQUIRED = new Set(["role", "team_status", "display_name"]);
  let attempts = 0;
  let working = { ...updates };
  while (Object.keys(working).length > 0 && attempts < 16) {
    const { error } = await admin.from("users").update(working as never).eq("id", authUser.id);
    if (!error) break;
    const match = COLUMN_ERR.exec(error.message ?? "");
    const missing = match?.[1] ?? match?.[2];
    if (missing && working[missing] !== undefined && !REQUIRED.has(missing)) {
      delete working[missing];
      attempts += 1;
      continue;
    }
    // For required-column failures we still proceed: the row exists from
    // ensureUserAccount, we just couldn't save extras.
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

  // Lark notification (fire and forget)
  void sendLarkNotification({
    title: `🆕 Yêu cầu gia nhập team — chờ IT duyệt${invite.label ? ` (${invite.label})` : ""}`,
    lines: [
      { label: "Tên", value: displayName },
      { label: "Email", value: email },
      { label: "SĐT", value: parsed.data.phone || "—" },
      { label: "Vị trí muốn ứng tuyển", value: parsed.data.applied_role || "—" },
      { label: "Lời nhắn", value: parsed.data.application_note || "—" },
      { label: "Facebook", value: parsed.data.facebook_url || "—" },
      { label: "Instagram", value: parsed.data.instagram_url || "—" },
      { label: "TikTok", value: parsed.data.tiktok_url || "—" },
      { label: "Discord", value: parsed.data.discord_url || "—" },
      { label: "Zalo", value: parsed.data.zalo_url || "—" },
      {
        label: "Game đang chơi",
        value:
          parsed.data.game_profiles.length === 0
            ? "—"
            : parsed.data.game_profiles
                .map((g) => `${g.custom_label || g.game}: ${g.uid}${g.nickname ? ` (${g.nickname})` : ""}`)
                .join(" | "),
      },
      { label: "IP", value: getClientIp(request) },
    ],
  }).catch(() => null);

  return NextResponse.json({ ok: true, status: "pending" });
}
