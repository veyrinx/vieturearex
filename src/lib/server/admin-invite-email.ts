import { siteConfig } from "@/lib/constants/site";

type SendAdminInviteEmailInput = {
  email: string;
  expiresAt: string;
  redirectTo?: string;
};

function buildInviteEmailHtml(redirectTo: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lời Mời Tạo Tài Khoản Quản Trị</title></head><body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"><div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; padding: 48px 32px; border-radius: 16px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04); text-align: center; border: 1px solid #e2e8f0;"><img src="${siteConfig.favicon}" alt="Arex" style="width: 72px; height: 72px; margin-bottom: 24px; display: block; margin-left: auto; margin-right: auto;"><h1 style="color: #0f172a; font-size: 26px; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.02em;">Lời Mời Quản Trị Viên</h1><p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 40px; text-align: left;">Xin chào,<br><br>Email của bạn vừa được chỉ định để khởi tạo tài khoản quản trị trên hệ thống Arex. Vui lòng nhấp vào nút bên dưới để hoàn tất việc thiết lập tài khoản và mật khẩu của bạn:</p><div style="margin-bottom: 40px;"><a href="${redirectTo}" style="display: inline-block; background: linear-gradient(135deg, #0052ff 0%, #4d7cff 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0, 82, 255, 0.25); letter-spacing: 0.5px;">TẠO TÀI KHOẢN KẾT NỐI</a></div><div style="text-align: left; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;"><p style="color: #64748b; font-size: 13px; margin: 0 0 8px; font-weight: 600; text-transform: uppercase;">Lưu Ý Quan Trọng:</p><ul style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;"><li>Đây là lời mời bảo mật, vui lòng không chuyển tiếp email này.</li><li>Lời mời này sẽ hết hạn trong 48 giờ.</li></ul></div><div style="border-top: 1px solid #e2e8f0; margin: 40px 0 24px;"></div><div style="text-align: center;"><p style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">© ${new Date().getFullYear()} Arex.</p><p style="color: #cbd5e1; font-size: 12px; margin: 0;">Nếu bạn chưa từng yêu cầu quyền quản trị, vui lòng báo cáo hoặc bỏ qua email này một cách an toàn.</p></div></div></body></html>`;
}

export async function sendAdminInviteEmail(input: SendAdminInviteEmailInput) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return { sent: false, configured: false, error: "Chưa cấu hình GMAIL_USER / GMAIL_APP_PASSWORD." };
  }

  const redirectTo = input.redirectTo ?? `${siteConfig.url}/auth/register?email=${encodeURIComponent(input.email)}`;

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Arex Admin" <${gmailUser}>`,
      to: input.email,
      subject: "[Arex] Lời mời tạo tài khoản Admin",
      html: buildInviteEmailHtml(redirectTo),
    });

    return { sent: true, configured: true };
  } catch (err) {
    console.error("[admin-invite] Gửi email thất bại:", err);
    return { sent: false, configured: true, error: String(err) };
  }
}
