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

/**
 * Điều hướng chân trang, chia nhóm.
 *
 * Trước đây là một danh sách phẳng 12 mục: "Lịch" nằm cạnh "Hợp Tác" cạnh "Nạp
 * An Toàn" — người tìm công cụ tra cứu phải đọc hết cả cột mới biết nó không có
 * ở đó. Ba nhóm theo ý định (đọc gì / dùng gì / hỏi ai) quét nhanh hơn hẳn.
 */
const footerNavGroups = [
  {
    heading: "Nội Dung",
    links: [
      { label: "Trang Chủ", href: "/" },
      { label: "Sự Kiện", href: "/events" },
      { label: "Lịch Sự Kiện", href: "/calendar" },
      { label: "Tin Tức", href: "/news" },
      { label: "Phát Trực Tiếp", href: "/esports" },
      { label: "Đang Hot", href: "/trending" },
      { label: "Thư Viện Ảnh", href: "/gallery" },
    ],
  },
  {
    heading: "Công Cụ",
    links: [
      { label: "Tra Cứu Người Chơi", href: "/player-lookup" },
      { label: "Tất Cả Công Cụ", href: "/tools" },
      { label: "Wiki Free Fire", href: "/wiki" },
      { label: "Chợ Arex", href: "/shop" },
      { label: "Nạp An Toàn", href: "/safe-topup" },
      { label: "Kiểm Tra Lừa Đảo", href: "/check-scam" },
    ],
  },
  {
    heading: "Cộng Đồng & Hỗ Trợ",
    links: [
      { label: "Về Chúng Tôi", href: "/about" },
      { label: "Đội Ngũ", href: "/team" },
      { label: "Cộng Đồng", href: "/community" },
      { label: "Hợp Tác", href: "/partnership" },
      { label: "Đăng Ký Nhận Tin", href: "/newsletter" },
      { label: "Cập Nhật Phiên Bản", href: "/changelog" },
      { label: "Liên Hệ", href: "/contact" },
    ],
  },
];

/* Ba link này trước đây xuất hiện hai lần: một khối thẻ có mô tả trong lưới
   chính, rồi lại một hàng link ở thanh đáy. Cùng đích đến, cách nhau 100px —
   khối thẻ chỉ làm chân trang dài thêm chứ không nói thêm điều gì. Nay chỉ còn
   hàng ở thanh đáy, nơi người ta quen tìm chúng. */
const footerLegal = [
  { label: "Chính Sách Bảo Mật", href: "/privacy-policy" },
  { label: "Điều Khoản Sử Dụng", href: "/terms-of-use" },
  { label: "Chính Sách Cookie", href: "/cookie-policy" },
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
    <footer className="site-footer relative mt-12 border-t border-border bg-card">
      {/* Top accent line with a slow traveling glint */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden bg-gradient-to-r from-transparent via-primary/45 to-transparent dark:via-amber-400/45">
        <div
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-white/80 to-transparent motion-reduce:hidden"
          style={{ animation: "shimmer 5s ease-in-out infinite" }}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="mx-auto max-w-7xl px-6 py-9 lg:px-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

          {/* Col 1 — Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Image
                src={logoLight}
                alt={siteName}
                width={40}
                height={40}
                className="block size-10 rounded-xl object-contain drop-shadow dark:hidden transition group-hover:scale-105"
              />
              <Image
                src={logoDark}
                alt={siteName}
                width={40}
                height={40}
                className="hidden size-10 rounded-xl object-contain drop-shadow dark:block transition group-hover:scale-105"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-brand text-lg uppercase tracking-[0.04em] text-foreground">
                  {siteName}
                </span>
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Community Hub
                </span>
              </div>
            </Link>

            <p className="max-w-[300px] text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
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
                    className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:hover:border-amber-400/40 dark:hover:bg-amber-400/10 dark:hover:text-amber-400"
                  >
                    <Icon className="size-4" />
                  </Link>
                );
              })}
            </div>

            {/* Thông tin liên hệ — ba ô viền riêng trước đây cao gần bằng cả cột
                điều hướng bên cạnh, cho đúng ba dòng chữ. Danh sách phẳng nói
                đủ từng ấy thông tin trong một phần ba chiều cao. */}
            <dl className="space-y-1 text-[13px]">
              {[
                { term: "Email", value: resolvedSocialLinks.email },
                { term: "Website", value: activeSite.url.replace("https://", "") },
                { term: "Múi giờ", value: "UTC+7 (ICT)" },
              ].map((row) => (
                <div key={row.term} className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground/70">{row.term}:</dt>
                  <dd className="break-all font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Col 2–4 — Điều hướng theo nhóm */}
          {footerNavGroups.map((group) => (
            <nav key={group.heading} className="flex flex-col gap-3" aria-label={group.heading}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60">
                {group.heading}
              </p>
              <ul className="flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="h-px w-0 bg-primary transition-all duration-200 group-hover:mr-2 group-hover:w-3 dark:bg-amber-400" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-3.5 lg:px-8">
          <div className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:justify-between sm:text-left">

            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-semibold text-foreground">
                © {year} {siteName}. All Rights Reserved.
              </p>
              <p className="text-[11px] text-muted-foreground">
                All images and related assets are the property of Garena Free Fire Vietnam.
              </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 sm:items-end">
              {/* Pháp lý — nay là chỗ duy nhất trên chân trang dẫn tới ba trang này. */}
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 sm:justify-end">
                {footerLegal.map((link, i) => (
                  <span key={link.href} className="flex items-center gap-2.5">
                    <Link
                      href={link.href}
                      className="text-[11px] text-muted-foreground transition-colors hover:text-primary dark:hover:text-amber-400"
                    >
                      {link.label}
                    </Link>
                    {i < footerLegal.length - 1 && (
                      <span className="select-none text-muted-foreground/30">·</span>
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
                  className="font-semibold text-muted-foreground/70 transition-colors hover:text-primary dark:hover:text-amber-400"
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
