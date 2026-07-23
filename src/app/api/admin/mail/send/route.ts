import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sendMail, buildEmailHtml, getEmailBranding, resolveSmtpConfig } from "@/lib/server/email";
import { logAdminActivity } from "@/lib/server/admin-activity";

const schema = z.object({
  to: z.string().min(3), // 1 hoặc nhiều email, cách nhau bởi , ; hoặc xuống dòng
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  cta_label: z.string().max(60).optional(),
  cta_url: z.string().url().optional(),
});

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// POST — Soạn & gửi email thủ công tới 1 hoặc nhiều người, ngoài các email tự động.
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "mail-send", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const config = await resolveSmtpConfig();
  if (!config) {
    return NextResponse.json({ error: "Chưa cấu hình email. Vào Cài đặt → Email để thiết lập." }, { status: 400 });
  }

  const recipients = Array.from(
    new Set(
      parsed.data.to
        .split(/[,;\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /.+@.+\..+/.test(s)),
    ),
  );
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Không có email người nhận hợp lệ." }, { status: 400 });
  }
  if (recipients.length > 50) {
    return NextResponse.json({ error: "Tối đa 50 người nhận mỗi lần gửi." }, { status: 400 });
  }

  const branding = await getEmailBranding();
  const html = buildEmailHtml({
    ...branding,
    title: parsed.data.subject,
    bodyHtml: esc(parsed.data.body).replace(/\n/g, "<br>"),
    cta:
      parsed.data.cta_label && parsed.data.cta_url
        ? { label: parsed.data.cta_label, url: parsed.data.cta_url }
        : undefined,
    footnote: "Email này được gửi thủ công từ ban quản trị.",
  });

  let sent = 0;
  const errors: string[] = [];
  for (const to of recipients) {
    const r = await sendMail({ to, subject: parsed.data.subject, html });
    if (r.sent) sent++;
    else errors.push(`${to}: ${r.error ?? "lỗi"}`);
  }

  await logAdminActivity({
    action: "MAIL_MANUAL_SENT",
    targetType: "MAIL",
    targetId: `manual:${Date.now()}`,
    summary: `Gửi email thủ công "${parsed.data.subject}" tới ${sent}/${recipients.length} người`,
  });

  return NextResponse.json({
    ok: sent > 0,
    sent,
    total: recipients.length,
    ...(errors.length ? { errors: errors.slice(0, 5) } : {}),
  });
}
