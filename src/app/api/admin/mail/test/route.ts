import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sendMail, buildEmailHtml, resolveSmtpConfig, getEmailBranding } from "@/lib/server/email";
import { siteConfig } from "@/lib/constants/site";

// POST { to?: string } — gửi 1 email thử để kiểm tra cấu hình SMTP/Gmail.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "mail-test", limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const config = await resolveSmtpConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình email. Điền SMTP/Gmail rồi lưu trước." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = typeof body.to === "string" && body.to.includes("@") ? body.to.trim() : config.fromEmail;

  const branding = await getEmailBranding();
  const html = buildEmailHtml({
    ...branding,
    title: "Email thử nghiệm ✅",
    bodyHtml:
      `Đây là email kiểm tra cấu hình gửi email của <strong>${siteConfig.name}</strong>.<br><br>` +
      `Nếu bạn nhận được email này, nghĩa là SMTP/Gmail đã hoạt động và các email hệ thống ` +
      `(quên mật khẩu, đăng ký thành công, thông báo…) sẽ gửi được bình thường. ` +
      `Ảnh banner đầu email phía trên chính là ảnh bạn vừa tải lên.`,
    cta: { label: "Mở Arex", url: siteConfig.url },
  });

  const result = await sendMail({ to, subject: `[${siteConfig.name}] Email thử nghiệm`, html });
  return NextResponse.json(
    { ok: result.sent, to, ...(result.error ? { error: result.error } : {}) },
    { status: result.sent ? 200 : 500 },
  );
}
