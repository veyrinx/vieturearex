import "server-only";
import { siteConfig } from "@/lib/constants/site";

type SmtpConfig = {
  host: string; port: number;
  user: string; pass: string;
  fromName: string; fromEmail: string;
};

async function resolveSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const { getSettings } = await import("@/lib/data/content-service");
    const settings = await getSettings();
    const get = (key: string) => settings.find((s) => s.key === key)?.value?.trim() ?? "";
    const host = get("mail.smtp_host");
    const user = get("mail.smtp_user");
    const pass = get("mail.smtp_pass");
    if (host && user && pass) {
      return {
        host, port: parseInt(get("mail.smtp_port") || "587", 10),
        user, pass,
        fromName: get("mail.from_name") || "Arex",
        fromEmail: get("mail.from_email") || user,
      };
    }
  } catch { /* fall through */ }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return {
      host: "smtp.gmail.com", port: 587,
      user: gmailUser, pass: gmailPass,
      fromName: "Arex", fromEmail: gmailUser,
    };
  }
  return null;
}

function buildResetEmailHtml(resetLink: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Đặt lại mật khẩu</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#fff;padding:48px 32px;border-radius:16px;box-shadow:0 12px 32px rgba(15,23,42,0.04);text-align:center;border:1px solid #e2e8f0;">
  <img src="${siteConfig.favicon}" alt="Arex" style="width:64px;height:64px;margin:0 auto 24px;display:block;">
  <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">Đặt lại mật khẩu</h1>
  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 36px;text-align:left;">
    Xin chào,<br><br>
    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Arex của bạn.
    Nhấp vào nút bên dưới để tạo mật khẩu mới. Link này sẽ hết hạn sau <strong>60 phút</strong>.
  </p>
  <div style="margin-bottom:36px;">
    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#0052ff 0%,#4d7cff 100%);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 8px 16px rgba(0,82,255,0.25);letter-spacing:0.3px;">
      ĐẶT LẠI MẬT KHẨU
    </a>
  </div>
  <div style="background:#f8fafc;padding:14px 16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;text-align:left;">
    <p style="color:#64748b;font-size:12px;margin:0;line-height:1.6;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.<br>
      Nếu không click được nút trên, sao chép đường link sau vào trình duyệt:<br>
      <span style="word-break:break-all;color:#0052ff;">${resetLink}</span>
    </p>
  </div>
  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Arex. Mọi quyền được bảo lưu.</p>
  </div>
</div>
</body></html>`;
}

export async function sendPasswordResetEmail(input: { email: string; resetLink: string }): Promise<{ sent: boolean; configured: boolean; error?: string }> {
  const config = await resolveSmtpConfig();
  if (!config) {
    return { sent: false, configured: false, error: "Chưa cấu hình SMTP." };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: input.email,
      subject: "[Arex] Đặt lại mật khẩu của bạn",
      html: buildResetEmailHtml(input.resetLink),
    });

    return { sent: true, configured: true };
  } catch (err) {
    console.error("[password-reset] Gửi email thất bại:", err);
    return { sent: false, configured: true, error: String(err) };
  }
}
