import Link from "next/link";
import Image from "next/image";
import {
  FacebookBrandIcon,
  GmailBrandIcon,
  TiktokBrandIcon,
  YoutubeBrandIcon,
} from "@/components/common/brand-icons";
import { getSettings } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";
import { buildSettingsMap, resolveSocialLinks } from "@/lib/utils/site-settings";
import { getSiteConfig } from "@/lib/server/get-site-config";

const DEFAULT_LOGO_LIGHT = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035";
const DEFAULT_LOGO_DARK = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441";

const footerNav = [
  { label: "Trang Chủ", href: "/" },
  { label: "Lịch", href: "/calendar" },
  { label: "Sự Kiện", href: "/events" },
  { label: "Phát Trực Tiếp", href: "/esports" },
  { label: "Tin Tức", href: "/news" },
  { label: "Đang Hot", href: "/dang-hot" },
  { label: "Đăng Ký Nhận Tin", href: "/dang-ky-tin" },
  { label: "Nạp An Toàn", href: "/nap-an-toan" },
  { label: "Cập Nhật", href: "/cap-nhat" },
  { label: "Về Chúng Tôi", href: "/about" },
  { label: "Liên Hệ", href: "/contact" },
];

const footerLegal = [
  {
    label: "Chính Sách Bảo Mật",
    href: "/privacy-policy",
    desc: "Cách chúng tôi thu thập và bảo vệ dữ liệu của bạn",
  },
  {
    label: "Điều Khoản Sử Dụng",
    href: "/terms-of-use",
    desc: "Quy định khi sử dụng dịch vụ và nền tảng Arex",
  },
  {
    label: "Chính Sách Cookie",
    href: "/cookie-policy",
    desc: "Thông tin về cookie và cách bạn kiểm soát chúng",
  },
];

export async function SiteFooter() {
  const [settings, activeSite] = await Promise.all([getSettings(), getSiteConfig()]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);
  const resolvedSocialLinks = resolveSocialLinks(settingsMap, activeSite.id);

  const logoLight = settingsMap["branding.logo_light_url"] || DEFAULT_LOGO_LIGHT;
  const logoDark = settingsMap["branding.logo_dark_url"] || DEFAULT_LOGO_DARK;
  const siteName = settingsMap["branding.site_name"] || activeSite.shortName;

  const socialLinks = [
    { label: "Facebook", href: resolvedSocialLinks.facebook, icon: FacebookBrandIcon },
    { label: "TikTok", href: resolvedSocialLinks.tiktok, icon: TiktokBrandIcon },
    ...(resolvedSocialLinks.youtube && resolvedSocialLinks.youtube !== "https://youtube.com"
      ? [{ label: "YouTube", href: resolvedSocialLinks.youtube, icon: YoutubeBrandIcon }]
      : []),
    {
      label: "Gmail",
      href: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(resolvedSocialLinks.email)}`,
      icon: GmailBrandIcon,
    },
  ];

  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 border-t border-border bg-card">
      {/* Top accent line with a slow traveling glint */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden bg-gradient-to-r from-transparent via-primary/45 to-transparent dark:via-amber-400/45">
        <div
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-white/80 to-transparent motion-reduce:hidden"
          style={{ animation: "shimmer 5s ease-in-out infinite" }}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.6fr_1.2fr]">

          {/* Col 1 — Brand */}
          <div className="flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <Image
                src={logoLight}
                alt={siteName}
                width={48}
                height={48}
                className="block size-12 rounded-xl object-contain drop-shadow dark:hidden transition group-hover:scale-105"
              />
              <Image
                src={logoDark}
                alt={siteName}
                width={48}
                height={48}
                className="hidden size-12 rounded-xl object-contain drop-shadow dark:block transition group-hover:scale-105"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-xl font-black uppercase tracking-[0.1em] text-foreground">
                  {siteName}
                </span>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Community Hub
                </span>
              </div>
            </Link>

            <p className="text-sm leading-6 text-muted-foreground max-w-[300px]">
              {settingsMap["site.description"] ?? activeSite.description}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                    className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-lg hover:shadow-primary/15 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-400 dark:hover:shadow-amber-400/15"
                  >
                    <Icon className="size-[17px]" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              Điều Hướng
            </p>
            <ul className="flex flex-col gap-2.5">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="h-px w-0 bg-primary transition-all duration-200 group-hover:mr-2 group-hover:w-3 dark:bg-amber-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Legal */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              Pháp Lý &amp; Chính Sách
            </p>
            <ul className="flex flex-col gap-3">
              {footerLegal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-muted/60"
                  >
                    <span className="text-sm font-semibold text-foreground transition group-hover:text-primary dark:group-hover:text-amber-400">
                      {link.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {link.desc}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              Liên Hệ
            </p>
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 mb-1">
                  Email
                </p>
                <p className="text-sm font-medium text-foreground break-all">
                  {resolvedSocialLinks.email}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 mb-1">
                  Website
                </p>
                <p className="text-sm font-medium text-foreground">
                  {activeSite.url.replace("https://", "")}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 mb-1">
                  Múi giờ hoạt động
                </p>
                <p className="text-sm font-medium text-foreground">
                  UTC+7 — Việt Nam (ICT)
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">

            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">
                © {year} {siteName}. All Rights Reserved.
              </p>
              <p className="text-xs text-muted-foreground">
                All images and related assets are the property of Garena Free Fire Vietnam.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 sm:items-end">
              {/* Inline legal links */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:justify-end">
                {footerLegal.map((link, i) => (
                  <span key={link.href} className="flex items-center gap-3">
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition hover:text-primary dark:hover:text-amber-400"
                    >
                      {link.label}
                    </Link>
                    {i < footerLegal.length - 1 && (
                      <span className="text-muted-foreground/30 select-none">·</span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/50">
                Thiết kế &amp; phát triển bởi{" "}
                <a
                  href="https://vieture.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-muted-foreground/70 transition hover:text-primary dark:hover:text-amber-400"
                >
                  vieture.tech
                </a>
              </p>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
