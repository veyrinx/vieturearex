import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addInvitedEmail,
  getInvitedEmails,
  removeInvitedEmail,
} from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sendAdminInviteEmail } from "@/lib/server/admin-invite-email";
import { logAdminActivity } from "@/lib/server/admin-activity";

const inviteSchema = z.object({
  email: z.string().email(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-invited-emails",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const invitedEmails = await getInvitedEmails();
  return NextResponse.json({ invitedEmails });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-invited-emails",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const payload = await request.json();
  const parsed = inviteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email payload." }, { status: 400 });
  }

  const invitedEmail = await addInvitedEmail(parsed.data.email);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const redirectTo = `${siteUrl}/auth/register?email=${encodeURIComponent(parsed.data.email)}`;
  
  const emailDelivery = await sendAdminInviteEmail({
    email: invitedEmail.email,
    expiresAt: invitedEmail.expires_at,
    redirectTo,
  });

  await logAdminActivity({
    action: "INVITE_CREATED",
    targetType: "INVITED_EMAIL",
    targetId: invitedEmail.id,
        summary: `Thêm email mời ${invitedEmail.email} hiệu lực đến ${new Date(invitedEmail.expires_at).toLocaleString("vi-VN")}`,
  });

  if (!emailDelivery.sent) {
    console.error("[invite] Email gửi thất bại:", JSON.stringify(emailDelivery));
  }

  return NextResponse.json({ invitedEmail, emailDelivery }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-invited-emails",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const payload = await request.json();
  const parsed = deleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing invitation id." }, { status: 400 });
  }

  await removeInvitedEmail(parsed.data.id);
  await logAdminActivity({
    action: "INVITE_REMOVED",
    targetType: "INVITED_EMAIL",
    targetId: parsed.data.id,
        summary: "Xóa lời mời tạo tài khoản admin",
  });
  return NextResponse.json({ ok: true });
}
