import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators/contact";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { siteConfig } from "@/lib/constants/site";

function buildContactEmailHtml(name: string, email: string, message: string) {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0052ff 0%,#003acc 100%);padding:32px 36px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.6);text-transform:uppercase;">AREX</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;letter-spacing:0.04em;text-transform:uppercase;">Liên Hệ Mới</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.16em;color:#4a4a6a;text-transform:uppercase;">Họ Tên</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#e8e8f0;">${name}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:20px;border-top:1px solid #1e1e2e;padding-top:20px;">
                  <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.16em;color:#4a4a6a;text-transform:uppercase;">Email</p>
                  <a href="mailto:${email}" style="margin:0;font-size:15px;font-weight:600;color:#0052ff;text-decoration:none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #1e1e2e;padding-top:20px;">
                  <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.16em;color:#4a4a6a;text-transform:uppercase;">Nội Dung</p>
                  <div style="background:#0d0d16;border:1px solid #1e1e2e;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#c8c8d8;white-space:pre-wrap;">${message}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0d0d16;border-top:1px solid #1e1e2e;padding:20px 36px;">
            <p style="margin:0;font-size:11px;color:#4a4a6a;text-align:center;letter-spacing:0.08em;">
              © ${new Date().getFullYear()} AREX · <a href="${siteConfig.url}" style="color:#0052ff;text-decoration:none;">${siteConfig.url}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "contact",
    limit: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const name = sanitizePlainText(parsed.data.name);
  const email = sanitizePlainText(parsed.data.email);
  const message = sanitizePlainText(parsed.data.message);

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `"Arex" <${gmailUser}>`,
        to: siteConfig.contactEmail,
        replyTo: email,
        subject: `[Arex] Liên hệ từ ${name}`,
        html: buildContactEmailHtml(name, email, message),
      });
    } catch (err) {
      console.error("[contact] Gửi email thất bại:", err);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
