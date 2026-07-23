import type { Metadata } from "next";
import Link from "next/link";
import {
  FacebookBrandIcon,
  GmailBrandIcon,
  TiktokBrandIcon,
  YoutubeBrandIcon,
} from "@/components/common/brand-icons";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { ContactInfo } from "@/components/common/contact-info";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap, resolveSocialLinks } from "@/lib/utils/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Liên Hệ",
  description: "Liên hệ với đội ngũ Arex qua email, Facebook, TikTok hoặc YouTube. Gửi góp ý, báo lỗi hoặc đề xuất hợp tác với cộng đồng Free Fire.",
};

export default async function ContactPage() {
  const settingsMap = buildSettingsMap(await getSettings());
  const socialLinks = resolveSocialLinks(settingsMap);
  const gmailComposeLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(socialLinks.email)}`;
  const socials = [
    {
      label: "FACEBOOK",
      href: socialLinks.facebook,
      icon: FacebookBrandIcon,
    },
    {
      label: "TIKTOK",
      href: socialLinks.tiktok,
      icon: TiktokBrandIcon,
    },
    // Chỉ hiện YouTube nếu admin đã điền URL thật
    ...(socialLinks.youtube && socialLinks.youtube !== "https://youtube.com"
      ? [{ label: "YOUTUBE", href: socialLinks.youtube, icon: YoutubeBrandIcon }]
      : []),
  ];

  return (
    <div className="space-y-6 pt-6 md:pt-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-primary/5 dark:from-amber-400/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15">
            <Mail className="size-6 text-blue-500" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Liên hệ</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Kết Nối Cộng Đồng
            </h1>
            <p className="text-sm text-muted-foreground">
              Gửi câu hỏi, góp ý hoặc đề xuất hợp tác với đội ngũ Arex
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
        <aside className="rounded-[24px] border border-border bg-card space-y-5 p-5">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h3 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
              Kênh chính thức
            </h3>
          </div>

          <div className="space-y-3">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-[18px] border border-border/70 bg-background/65 px-4 py-4 transition hover:border-primary/35 hover:bg-background/85"
                >
                  <div className="flex size-12 items-center justify-center rounded-[14px] border border-border/70 bg-card/90">
                    <Icon className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.1em] text-foreground">{social.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="rounded-[18px] border border-border/70 bg-background/65 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[14px] border border-border/70 bg-card/90">
                <GmailBrandIcon className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-foreground">EMAIL HỖ TRỢ</p>
              </div>
            </div>
            <Link
              href={gmailComposeLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium uppercase tracking-[0.08em] text-foreground transition hover:text-primary"
            >
              {socialLinks.email}
            </Link>
          </div>
        </aside>

        <ContactForm />
      </div>

      {/* Tất cả kênh liên hệ — tự đọc từ cài đặt Mạng Xã Hội */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h3 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
            Tất cả kênh liên hệ
          </h3>
        </div>
        <ContactInfo />
      </section>
    </div>
  );
}
