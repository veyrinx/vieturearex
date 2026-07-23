import "server-only";
import { siteConfig } from "@/lib/constants/site";
import { getSettings } from "@/lib/data/content-service";

// ── Nguồn cấu hình email dùng chung (Gmail SMTP hoặc SMTP bất kỳ) ────────────
// Cấu hình ở Admin → Cài đặt → Email. Mọi loại email (quên mật khẩu, đăng ký
// thành công, thông báo, mời admin…) đều đi qua đây — thêm loại mới chỉ cần viết
// 1 hàm gọi sendMail + buildEmailHtml.

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

export async function resolveSmtpConfig(): Promise<SmtpConfig | null> {
  // 1. Ưu tiên cấu hình trong DB (Admin → Cài đặt → Email).
  try {
    const settings = await getSettings();
    const get = (key: string) => settings.find((s) => s.key === key)?.value?.trim() ?? "";
    const host = get("mail.smtp_host");
    const user = get("mail.smtp_user");
    const pass = get("mail.smtp_pass");
    if (host && user && pass) {
      return {
        host,
        port: parseInt(get("mail.smtp_port") || "587", 10),
        user,
        pass,
        fromName: get("mail.from_name") || "Arex",
        fromEmail: get("mail.from_email") || user,
      };
    }
  } catch {
    /* DB lỗi — rơi xuống biến môi trường */
  }

  // 2. Fallback biến môi trường Gmail.
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return {
      host: "smtp.gmail.com",
      port: 587,
      user: gmailUser,
      pass: gmailPass,
      fromName: "Arex",
      fromEmail: gmailUser,
    };
  }
  return null;
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await resolveSmtpConfig()) !== null;
}

/** Bật/tắt từng loại email trong settings (mặc định theo defaultOn). */
export async function isMailTypeEnabled(key: string, defaultOn = true): Promise<boolean> {
  try {
    const settings = await getSettings();
    const v = settings.find((s) => s.key === key)?.value;
    if (v == null || v === "") return defaultOn;
    return v !== "false";
  } catch {
    return defaultOn;
  }
}

export type SendMailInput = { to: string; subject: string; html: string; replyTo?: string };
export type SendMailResult = { sent: boolean; configured: boolean; error?: string };

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = await resolveSmtpConfig();
  if (!config) {
    return { sent: false, configured: false, error: "Chưa cấu hình email. Vào Cài đặt → Email để thiết lập SMTP/Gmail." };
  }
  try {
    const nodemailer = await import("nodemailer");
    const isSecure = config.port === 465;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isSecure, // 465 = SSL ngầm; 587/25 = STARTTLS
      auth: { user: config.user, pass: config.pass },
      // Máy chủ mail riêng (vd mail.arexnetwork.site) hay dùng STARTTLS trên 587 và
      // có chứng chỉ self-signed / không khớp tên miền → nới lỏng xác thực để gửi được.
      requireTLS: !isSecure,
      tls: { servername: config.host, rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    return { sent: true, configured: true };
  } catch (err) {
    console.error("[email] Gửi thất bại:", err);
    return { sent: false, configured: true, error: String(err) };
  }
}

function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Khung email thương hiệu Arex dùng chung. Thêm 1 loại email mới = gọi hàm này
 * với title + bodyHtml (+ nút CTA tuỳ chọn), rồi truyền vào sendMail.
 */
export function buildEmailHtml(opts: {
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const cta = opts.cta
    ? `<div style="margin:8px 0 32px;text-align:center;"><a href="${opts.cta.url}" style="display:inline-block;background:linear-gradient(135deg,#0052ff 0%,#4d7cff 100%);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 38px;border-radius:12px;box-shadow:0 8px 16px rgba(0,82,255,0.25);letter-spacing:0.3px;">${e(opts.cta.label)}</a></div>`
    : "";
  const footnote = opts.footnote
    ? `<div style="background:#f8fafc;padding:14px 16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;text-align:left;"><p style="color:#64748b;font-size:12px;margin:0;line-height:1.6;">${opts.footnote}</p></div>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${e(opts.title)}</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#fff;padding:44px 32px;border-radius:16px;box-shadow:0 12px 32px rgba(15,23,42,0.04);text-align:center;border:1px solid #e2e8f0;">
  <img src="${siteConfig.favicon}" alt="Arex" style="width:64px;height:64px;margin:0 auto 24px;display:block;">
  <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.02em;">${e(opts.title)}</h1>
  <div style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;text-align:left;">${opts.bodyHtml}</div>
  ${cta}
  ${footnote}
  <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${e(siteConfig.name)}. Mọi quyền được bảo lưu.</p>
  </div>
</div>
</body></html>`;
}

// ── Các loại email cụ thể ────────────────────────────────────────────────────

/** Email chào mừng sau khi đăng ký thành công. */
export async function sendWelcomeEmail(input: { to: string; name?: string | null }): Promise<SendMailResult> {
  if (!(await isMailTypeEnabled("mail.send_welcome", true))) {
    return { sent: false, configured: true, error: "disabled" };
  }
  const name = input.name?.trim() || "bạn";
  const html = buildEmailHtml({
    title: "Đăng ký thành công 🎉",
    bodyHtml:
      `Xin chào <strong>${e(name)}</strong>,<br><br>` +
      `Chào mừng bạn đến với <strong>${e(siteConfig.name)}</strong> — cổng thông tin cộng đồng Free Fire. ` +
      `Tài khoản của bạn đã được tạo thành công. Khám phá tin tức, sự kiện, giải đấu, công cụ tra cứu nick và nhiều hơn nữa.`,
    cta: { label: "Vào Arex ngay", url: siteConfig.url },
    footnote: "Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email hoặc liên hệ đội ngũ hỗ trợ.",
  });
  return sendMail({ to: input.to, subject: `[${siteConfig.name}] Đăng ký thành công`, html });
}

/** Email thông báo chung — gương của thông báo trong web. */
export async function sendNotificationEmail(input: {
  to: string;
  title: string;
  body?: string | null;
  url?: string | null;
}): Promise<SendMailResult> {
  const bodyHtml =
    (input.body ? `${e(input.body)}<br><br>` : "") +
    `Bạn nhận được thông báo này từ <strong>${e(siteConfig.name)}</strong>.`;
  const fullUrl = input.url
    ? input.url.startsWith("http") ? input.url : `${siteConfig.url}${input.url}`
    : siteConfig.url;
  const html = buildEmailHtml({
    title: input.title,
    bodyHtml,
    cta: { label: "Xem chi tiết", url: fullUrl },
    footnote: "Bạn có thể tắt email thông báo trong phần cài đặt của quản trị viên.",
  });
  return sendMail({ to: input.to, subject: `[${siteConfig.name}] ${input.title}`, html });
}
