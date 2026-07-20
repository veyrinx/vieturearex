import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { CopyableLegalLink } from "../../../components/CopyableLegalLink";
import { Reveal } from "@/components/common/reveal";

export const metadata: Metadata = {
  title: "Chính Sách Bảo Mật | Arex",
  description:
    "Chính sách bảo mật của Arex — tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và Luật An toàn thông tin mạng 2015.",
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Scale: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="12" y1="3" x2="12" y2="20" /><path d="M5 20h14" /><path d="M3 6l9-3 9 3" />
      <path d="M3 6l3 6c0 1.66-1.34 3-3 3s-3-1.34-3-3l3-6z" /><path d="M21 6l3 6c0 1.66-1.34 3-3 3s-3-1.34-3-3l3-6z" />
    </svg>
  ),
  Cookie: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" /><circle cx="8" cy="8" r="0.5" fill="currentColor" />
      <circle cx="15" cy="9" r="0.5" fill="currentColor" /><circle cx="9" cy="14" r="0.5" fill="currentColor" />
      <circle cx="14" cy="15" r="0.5" fill="currentColor" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Share: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Database: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Court: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 inline-block ml-1">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 mt-0.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 flex-shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

const LEGAL_REFS = [
  { label: "Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=13/2023/NĐ-CP" },
  { label: "Luật An toàn thông tin mạng 2015 (86/2015/QH13)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=86/2015/QH13" },
  { label: "Luật An ninh mạng 2018 (24/2018/QH14)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=24/2018/QH14" },
  { label: "Luật Sở hữu trí tuệ 2005 (sửa đổi 2022 - 07/2022/QH15)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=07/2022/QH15" },
  { label: "Nghị định 17/2023/NĐ-CP (Quy định chi tiết Luật SHTT)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=17/2023/NĐ-CP" },
  { label: "Nghị định 72/2013/NĐ-CP (Quản lý Internet và MXH)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=72/2013/NĐ-CP" },
  { label: "Luật Giao dịch điện tử 2023 (20/2023/QH15)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=20/2023/QH15" },
];

const TOC = [
  { id: "s1",  num: "01", title: "Giới Thiệu",             Icon: Icons.Shield },
  { id: "s2",  num: "02", title: "Phạm Vi Áp Dụng",        Icon: Icons.Globe },
  { id: "s3",  num: "03", title: "Thông Tin Thu Thập",      Icon: Icons.BarChart },
  { id: "s4",  num: "04", title: "Mục Đích Sử Dụng",        Icon: Icons.Target },
  { id: "s5",  num: "05", title: "Cơ Sở Pháp Lý",           Icon: Icons.Scale },
  { id: "s6",  num: "06", title: "Cookie & Theo Dõi",        Icon: Icons.Cookie },
  { id: "s7",  num: "07", title: "Nguồn Ảnh & Attribution", Icon: Icons.Image },
  { id: "s8",  num: "08", title: "Quyền Người Dùng",        Icon: Icons.User },
  { id: "s9",  num: "09", title: "Bảo Mật Kỹ Thuật",        Icon: Icons.Lock },
  { id: "s10", num: "10", title: "Chia Sẻ Thông Tin",        Icon: Icons.Share },
  { id: "s11", num: "11", title: "Lưu Trữ Dữ Liệu",         Icon: Icons.Database },
  { id: "s12", num: "12", title: "Thông Báo Vi Phạm",        Icon: Icons.Bell },
  { id: "s13", num: "13", title: "Giải Quyết Tranh Chấp",   Icon: Icons.Court },
  { id: "s14", num: "14", title: "Miễn Trừ Trách Nhiệm",    Icon: Icons.AlertTriangle },
  { id: "s15", num: "15", title: "Thay Đổi Chính Sách",      Icon: Icons.Edit },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Card({ id, num, title, Icon, tag, children }: {
  id: string; num: string; title: string;
  Icon: () => ReactElement; tag?: string; children: React.ReactNode;
}) {
  const revealDelay = Math.min((Number(num) - 1) * 0.025, 0.16);

  return (
    <Reveal once delay={revealDelay} distance={26} duration={0.58}>
      <article id={id} className="policy-interactive-card group relative scroll-mt-28 overflow-hidden rounded-[26px] border border-border bg-card/95 shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color,background-color,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)] hover:brightness-[1.01] dark:hover:border-amber-400/25 dark:hover:shadow-[0_22px_54px_rgba(0,0,0,0.34)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.10),transparent_34%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_top_right,rgba(247,147,26,0.14),transparent_34%)]" />
        <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary via-primary/40 to-transparent dark:from-amber-400 dark:via-amber-400/40" />
        <div className="relative p-5 md:p-6 lg:p-7">
          <div className="mb-4 flex items-center gap-4 md:mb-5">
            <div className="relative flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-muted/60 to-muted/30 text-primary shadow-inner transition-colors group-hover:border-primary/30 dark:text-amber-400 dark:group-hover:border-amber-400/30">
                <Icon />
              </div>
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white dark:bg-amber-500">{num}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-black uppercase tracking-[0.06em] text-foreground md:text-xl xl:text-[1.5rem]">{title}</h2>
              {tag && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-400 md:text-xs">
                  <Icons.Scale />
                  <span>{tag}</span>
                </span>
              )}
            </div>
          </div>
          <div className="space-y-3 text-[15px] leading-7 text-muted-foreground md:space-y-3.5 md:text-[15px] xl:text-[16px] xl:leading-7">{children}</div>
        </div>
      </article>
    </Reveal>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-4 text-[15px] leading-7 transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm dark:hover:border-amber-400/25 dark:hover:bg-amber-400/[0.03] md:px-5 md:py-4 md:text-[15px] xl:text-[16px] xl:leading-7">
      <Icons.CheckCircle />
      <span>{children}</span>
    </div>
  );
}

function Alert({ kind = "info", title, children }: { kind?: "info" | "warn" | "success" | "danger"; title?: string; children: React.ReactNode }) {
  const cfg = {
    info:    "border-primary/20 bg-primary/5 dark:border-amber-400/20 dark:bg-amber-400/5",
    warn:    "border-orange-400/25 bg-orange-400/5",
    success: "border-green-500/25 bg-green-500/5",
    danger:  "border-red-500/25 bg-red-500/5",
  }[kind];
  const icons = { info: "i", warn: "!", success: "✓", danger: "!" };
  return (
    <div className={`rounded-xl border px-4 py-4 md:px-5 md:py-4 ${cfg}`}>
      {title && <p className="mb-3 flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-foreground md:text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-black">{icons[kind]}</span>{title}</p>}
      <p className={`text-[15px] leading-7 text-muted-foreground md:text-[15px] xl:text-[16px] xl:leading-7${!title ? " flex items-start gap-3" : ""}`}>{children}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PrivacyPolicyPage() {
  return (
    <div className="relative left-1/2 right-1/2 mx-auto w-[calc(100vw-1rem)] max-w-[2150px] -translate-x-1/2 px-4 pt-8 pb-24 md:w-[calc(100vw-2.5rem)] md:px-8 md:pt-14 xl:w-[calc(100vw-4rem)] xl:px-12 2xl:px-16">

      {/* Hero */}
      <Reveal once distance={18} duration={0.65}>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border shadow-[0_20px_48px_rgba(15,23,42,0.08)] md:mb-7">
        <div className="absolute inset-0 bg-gradient-to-br from-[#000c24] via-[#00153d] to-[#090030]" />
        <div aria-hidden className="policy-hero-orb pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-blue-600/20 blur-[100px]" />
        <div aria-hidden className="policy-hero-orb policy-hero-orb--slow pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-indigo-500/15 blur-[80px]" />
        {/* GFF-style diagonal stripes */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)" }} />
        <div className="relative z-10 px-6 py-12 text-center md:px-16 md:py-16 lg:px-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            Tài liệu pháp lý chính thức · Arex
          </div>
          <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-lg md:text-5xl xl:text-6xl">
            Chính Sách<br className="hidden sm:block" /> Bảo Mật
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/55 md:text-[15px]">
            <span className="font-semibold text-white">Arex</span> cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn theo quy định pháp luật Việt Nam hiện hành.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {[["Hiệu lực: 02/04/2026"],["Phiên bản 2.0"],["Pháp luật Việt Nam"],["Privacy-first"]].map(([l]) => (
              <span key={l} className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] tracking-wide text-white/40">{l}</span>
            ))}
          </div>
        </div>
      </div>
      </Reveal>

      {/* Quick info */}
      <Reveal once delay={0.04} distance={20} duration={0.58}>
      <div className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)] md:mb-7 md:p-7">
        <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 md:text-sm">Thông Tin Chính Sách</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Đơn vị quản lý","Arex"],
            ["Email liên hệ","contact@arexnetwork.site"],
            ["Ngày hiệu lực","02/04/2026"],
            ["Luật áp dụng","NĐ 13/2023 · Luật ATTTM 2015"],
            ["Phạm vi","Mọi người dùng truy cập"],
            ["Font","GFF Latin — Garena Free Fire™"],
          ].map(([l,v]) => (
            <div key={l} className="policy-interactive-card rounded-2xl border border-border/60 bg-background/60 p-5 shadow-sm backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow,filter] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md hover:brightness-[1.01] dark:hover:border-amber-400/20 md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground/50 md:text-sm">{l}</p>
              <p className="mt-2 text-base font-bold leading-snug text-foreground md:text-lg xl:text-[19px]">{v}</p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      {/* Layout */}
      <div className="space-y-6 xl:space-y-7 2xl:grid 2xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:items-start 2xl:gap-7 2xl:space-y-0">

        {/* Sidebar TOC */}
        <Reveal once delay={0.08} distance={22} duration={0.58}>
        <aside className="hidden 2xl:block 2xl:sticky 2xl:top-24 2xl:w-full 2xl:self-start">
          <nav className="rounded-3xl border border-border bg-card/95 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm" aria-label="Mục lục chính sách bảo mật">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground/50">Mục Lục</p>
            <ul className="space-y-1">
              {TOC.map(({ id, num, title, Icon }) => (
                <li key={id}>
                  <a href={`#${id}`} className="group/link flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold text-muted-foreground transition-[transform,color,background-color] duration-300 hover:translate-x-1 hover:bg-primary/6 hover:text-primary dark:hover:bg-amber-400/6 dark:hover:text-amber-400">
                    <span className="text-muted-foreground/30 group-hover/link:text-primary dark:group-hover/link:text-amber-400 transition-colors"><Icon /></span>
                    <span className="text-xs font-black tabular-nums text-muted-foreground/30">{num}</span>
                    <span className="leading-tight">{title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        </Reveal>

        {/* Content */}
        <div className="min-w-0 space-y-5 2xl:space-y-6">

          <Card id="s1" num="01" title="Giới Thiệu" Icon={Icons.Shield}>
            <p>
              <strong className="text-foreground">Arex</strong> là dự án cộng đồng phi lợi nhuận chuyên cung cấp tin tức, lịch sự kiện và nội dung liên quan đến game <strong className="text-foreground">Free Fire</strong> tại Việt Nam. Chúng tôi <strong className="text-foreground">không phải là Garena</strong> và không có liên kết chính thức với bất kỳ tổ chức phát hành game nào.
            </p>
            <p>
              Website sử dụng <strong className="text-foreground">font chữ GFF Latin</strong> — phông chữ của thương hiệu Garena Free Fire, được sử dụng nhằm mục đích trang trí nhận diện thương hiệu cộng đồng. Mọi hình ảnh sự kiện, nhân vật và tài sản game được lấy từ nguồn Garena Free Fire Official và được ghi rõ nguồn gốc theo quy định của Luật Sở hữu trí tuệ.
            </p>
            <Alert kind="info" title="Cơ sở pháp lý áp dụng">
              Chính sách này tuân thủ: <em>Luật BVDL cá nhân 2025</em> (91/2025/QH15), <em>Nghị định 13/2023/NĐ-CP</em> và <em>Luật An toàn thông tin mạng 2015</em> (86/2015/QH13).
            </Alert>
          </Card>

          <Card id="s2" num="02" title="Phạm Vi Áp Dụng" Icon={Icons.Globe}>
            <p>Chính sách này áp dụng cho tất cả dữ liệu cá nhân thu thập khi bạn:</p>
            <div className="space-y-2">
              <Item>Truy cập bất kỳ trang nào thuộc website Arex</Item>
              <Item>Điền vào biểu mẫu liên hệ hoặc đăng ký nhận thông báo</Item>
              <Item>Tương tác với các cookie và công cụ phân tích trên website</Item>
              <Item>Gửi báo cáo lỗi, góp ý hoặc khiếu nại qua kênh hỗ trợ</Item>
            </div>
            <p>Chính sách <strong className="text-foreground">không áp dụng</strong> cho các trang web bên thứ ba mà bạn truy cập qua liên kết ngoài.</p>
          </Card>

          <Card id="s3" num="03" title="Thông Tin Thu Thập" Icon={Icons.BarChart} tag="Minh bạch theo NĐ 13/2023">
            <p>Chúng tôi thu thập ba nhóm thông tin:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              {[
                { h: "Bạn cung cấp", items: ["Họ tên & địa chỉ email", "Nội dung tin nhắn / yêu cầu", "Thông tin đăng nhập (admin)"] },
                { h: "Thu thập tự động", items: ["Địa chỉ IP & nhà mạng", "Loại trình duyệt & thiết bị", "Trang truy cập & thời lượng"] },
                { h: "Qua Cookie", items: ["Dữ liệu phiên đăng nhập", "Google Analytics (ẩn danh)", "Tùy chọn giao diện người dùng"] },
              ].map(({ h, items }) => (
                <div key={h} className="rounded-xl border border-border/60 bg-background/50 p-3">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary dark:text-amber-400">{h}</p>
                  <ul className="space-y-1.5">
                    {items.map((i) => <li key={i} className="flex items-start gap-1.5 text-xs"><Icons.ChevronRight />{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <Alert kind="success">Chúng tôi <strong className="text-foreground">không thu thập</strong> mật khẩu Garena, số điện thoại hay thông tin tài chính.</Alert>
          </Card>

          <Card id="s4" num="04" title="Mục Đích Sử Dụng Dữ Liệu" Icon={Icons.Target}>
            <p>Dữ liệu của bạn chỉ được dùng cho các mục đích sau:</p>
            <div className="space-y-2">
              {["Cung cấp và cải thiện tính năng website","Gửi thông báo tin tức, sự kiện Free Fire theo yêu cầu","Trả lời yêu cầu hỗ trợ và liên hệ từ bạn","Phân tích lưu lượng truy cập để tối ưu trải nghiệm","Bảo mật hệ thống và phát hiện hành vi bất thường","Tuân thủ nghĩa vụ pháp lý theo quy định Việt Nam"].map((t) => (
                <Item key={t}>{t}</Item>
              ))}
            </div>
            <Alert kind="warn">Chúng tôi cam kết <strong className="text-foreground">không bán dữ liệu</strong>, không dùng vào mục đích thương mại hay quảng cáo bên thứ ba.</Alert>
          </Card>

          <Card id="s5" num="05" title="Cơ Sở Pháp Lý Thu Thập & Xử Lý" Icon={Icons.Scale} tag="Điều 11 — NĐ 13/2023">
            <p>Căn cứ <em>Nghị định 13/2023/NĐ-CP</em>, chúng tôi xử lý dữ liệu dựa trên:</p>
            <div className="space-y-2">
              <Item><strong className="text-foreground">Sự đồng ý (Consent):</strong> Bạn tự nguyện cung cấp thông tin hoặc bấm «Đồng ý» trên banner cookie.</Item>
              <Item><strong className="text-foreground">Thực hiện dịch vụ:</strong> Dữ liệu cần thiết để gửi bản tin, phản hồi liên hệ theo yêu cầu.</Item>
              <Item><strong className="text-foreground">Tuân thủ pháp lý:</strong> Lưu trữ theo yêu cầu hợp pháp của cơ quan nhà nước Việt Nam.</Item>
              <Item><strong className="text-foreground">Lợi ích hợp pháp:</strong> Phân tích ẩn danh để tối ưu website — không nhận dạng cá nhân cụ thể.</Item>
            </div>
            <Alert kind="info">Bạn có quyền <strong className="text-foreground">rút lại sự đồng ý</strong> bất kỳ lúc nào mà không ảnh hưởng đến tính hợp pháp của việc xử lý trước đó.</Alert>
          </Card>

          <Card id="s6" num="06" title="Cookie & Công Nghệ Theo Dõi" Icon={Icons.Cookie} tag="Yêu cầu đồng ý rõ ràng">
            <p>Theo <em>Nghị định 13/2023/NĐ-CP</em>, chúng tôi phải có sự đồng ý rõ ràng trước khi đặt cookie không thiết yếu.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { dot:"bg-green-400", label:"Thiết Yếu", sub:"Luôn bật — không cần đồng ý", desc:"Cookie phiên đăng nhập, tùy chọn giao diện. Cần thiết cho hoạt động cơ bản." },
                { dot:"bg-blue-400",  label:"Phân Tích",  sub:"Yêu cầu đồng ý", desc:"Google Analytics — dữ liệu ẩn danh, giúp hiểu lưu lượng. Có thể từ chối." },
                { dot:"bg-slate-400", label:"Quảng Cáo",  sub:"Hiện không sử dụng", desc:"Arex chưa sử dụng cookie quảng cáo hay remarketing." },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border/60 bg-background/50 p-3">
                  <div className="mb-1.5 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} /><p className="text-xs font-bold text-foreground">{c.label}</p></div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">{c.sub}</p>
                  <p className="text-xs leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Garena Image Attribution */}
          <Card id="s7" num="07" title="Nguồn Ảnh & Quyền Sử Dụng Hình Ảnh" Icon={Icons.Image} tag="Luật SHTT 2005 — Điều 25">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Icons.Image />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold uppercase tracking-wider text-foreground mb-1">Tuyên bố về nguồn hình ảnh</p>
                  <p className="text-sm leading-relaxed">
                    Toàn bộ hình ảnh sự kiện, nhân vật, banner và tài sản trực quan trên website Arex được lấy từ{" "}
                    <strong className="text-foreground">Garena Free Fire Official</strong> — bao gồm kênh Facebook, website chính thức và các kênh truyền thông của Garena tại Việt Nam.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Item><strong className="text-foreground">Ghi nguồn bắt buộc:</strong> Mọi hình ảnh từ Garena đều được chú thích rõ «Ảnh: Garena Free Fire» hoặc nguồn tương đương theo quy định.</Item>
              <Item><strong className="text-foreground">Mục đích phi thương mại:</strong> Hình ảnh chỉ được sử dụng để cung cấp thông tin, bình luận và tổng hợp tin tức — tuân thủ <em>Điều 25, Luật SHTT</em> về trích dẫn hợp lý.</Item>
              <Item><strong className="text-foreground">Không xác nhận quyền sở hữu:</strong> Arex tuyên bố rõ ràng rằng tất cả thương hiệu, logo, nhân vật và tài sản thuộc quyền sở hữu của <strong className="text-foreground">Garena / Sea Limited</strong>.</Item>
              <Item><strong className="text-foreground">Quyền yêu cầu gỡ bỏ:</strong> Chủ sở hữu bản quyền có quyền yêu cầu gỡ bỏ nội dung bất kỳ lúc nào qua email <strong className="text-foreground">contact@arexnetwork.site</strong>. Chúng tôi sẽ xử lý trong vòng 24 giờ.</Item>
              <Item><strong className="text-foreground">Font GFF Latin:</strong> Font chữ được sử dụng trên website mang phong cách thương hiệu Free Fire. Arex sử dụng font này cho mục đích nhận diện cộng đồng.</Item>
            </div>
            <Alert kind="info">
              Nếu bạn là đại diện của Garena và có yêu cầu về bản quyền, vui lòng liên hệ trực tiếp:{" "}
              <strong className="text-foreground">contact@arexnetwork.site</strong> — chúng tôi cam kết xử lý trong 24 giờ.
            </Alert>
          </Card>

          <Card id="s8" num="08" title="Quyền Của Người Dùng" Icon={Icons.User} tag="Luật BVDL cá nhân 2025">
            <p>Theo <em>Luật 91/2025/QH15</em>, bạn có các quyền sau đối với dữ liệu cá nhân:</p>
            <div className="space-y-2">
              {[
                ["Quyền truy cập","Yêu cầu xem dữ liệu cá nhân chúng tôi đang lưu trữ về bạn."],
                ["Quyền chỉnh sửa","Yêu cầu cập nhật thông tin không chính xác hoặc không đầy đủ."],
                ["Quyền xóa (Quyền được lãng quên)","Yêu cầu xóa dữ liệu khi không còn cần thiết hoặc khi rút đồng ý."],
                ["Quyền hạn chế xử lý","Tạm dừng xử lý trong thời gian xác minh tính chính xác của dữ liệu."],
                ["Quyền phản đối","Phản đối việc xử lý dữ liệu vì lợi ích hợp pháp hoặc tiếp thị."],
                ["Quyền rút lại đồng ý","Rút đồng ý bất kỳ lúc — không ảnh hưởng đến xử lý hợp pháp trước đó."],
              ].map(([r,d]) => (
                <Item key={r}><strong className="text-foreground">{r}:</strong> {d}</Item>
              ))}
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:border-amber-400/20 dark:bg-amber-400/5 px-4 py-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary dark:text-amber-400">Cách thực hiện quyền</p>
              <p className="text-sm">Gửi yêu cầu đến <strong className="text-foreground">contact@arexnetwork.site</strong> với tiêu đề <em>«YÊU CẦU QUYỀN DỮ LIỆU»</em>. Chúng tôi phản hồi trong <strong className="text-foreground">15 ngày làm việc</strong>.</p>
            </div>
          </Card>

          <Card id="s9" num="09" title="Bảo Mật Kỹ Thuật" Icon={Icons.Lock} tag="ISO/IEC 27001">
            <p>Các biện pháp kỹ thuật được áp dụng để bảo vệ dữ liệu của bạn:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ["HTTPS/TLS","Mã hóa toàn bộ dữ liệu truyền tải trình duyệt ↔ máy chủ"],
                ["Mã hóa CSDL","Mật khẩu & dữ liệu nhạy cảm được mã hóa trong database"],
                ["Sao lưu định kỳ","Backup thường xuyên với lưu trữ dự phòng ngoài site"],
                ["Tường lửa WAF","Chống SQL injection, XSS và các mối đe dọa phổ biến"],
                ["CSP & HSTS","Content Security Policy ngăn chặn tấn công cross-site"],
                ["2FA bắt buộc","Xác thực 2 yếu tố bắt buộc với mọi tài khoản quản trị"],
                ["Nhật ký hệ thống","Ghi nhận & giám sát để phát hiện hành vi bất thường"],
                ["Phân quyền chặt","Chỉ nhân sự được ủy quyền mới truy cập dữ liệu cá nhân"],
              ].map(([t,d]) => (
                <div key={t} className="rounded-xl border border-border/60 bg-background/50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">{t}</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
            <p className="text-xs">Hạ tầng: <strong className="text-foreground">Vercel</strong> & <strong className="text-foreground">Supabase</strong> — chứng chỉ bảo mật cấp doanh nghiệp.</p>
          </Card>

          <Card id="s10" num="10" title="Chia Sẻ Thông Tin" Icon={Icons.Share}>
            <Alert kind="success">Arex <strong className="text-foreground">không bán, cho thuê hay trao đổi</strong> dữ liệu cá nhân vì bất kỳ mục đích thương mại nào.</Alert>
            <div className="space-y-2 mt-1">
              <Item><strong className="text-foreground">Vercel & Supabase:</strong> Nhà cung cấp hạ tầng kỹ thuật — chỉ để vận hành website, cam kết bảo mật dữ liệu theo tiêu chuẩn quốc tế.</Item>
              <Item><strong className="text-foreground">Google Analytics:</strong> Dữ liệu lưu lượng truy cập hoàn toàn ẩn danh — không nhận dạng cá nhân cụ thể.</Item>
              <Item><strong className="text-foreground">Cơ quan chức năng Việt Nam:</strong> Chỉ khi có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền theo pháp luật.</Item>
            </div>
          </Card>

          <Card id="s11" num="11" title="Lưu Trữ Dữ Liệu" Icon={Icons.Database}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm md:text-base">
                <thead>
                  <tr>{["Loại dữ liệu","Thời gian lưu trữ"].map((h) => <th key={h} className="border border-border/60 bg-muted/40 px-3 py-2 text-left font-bold uppercase tracking-wide text-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[["Tài khoản quản trị","Suốt thời gian hoạt động + 12 tháng sau khi xóa"],["Dữ liệu liên hệ","Tối đa 2 năm kể từ ngày nhận"],["Nhật ký truy cập","Tối đa 90 ngày"],["Dữ liệu theo yêu cầu pháp lý","Theo thời hạn quy định của cơ quan chức năng"]].map(([t,d]) => (
                    <tr key={t} className="hover:bg-muted/20 transition-colors">
                      <td className="border border-border/60 px-3 py-2 font-medium text-foreground">{t}</td>
                      <td className="border border-border/60 px-3 py-2">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Sau khi hết hạn, dữ liệu sẽ được <strong className="text-foreground">xóa an toàn hoặc ẩn danh hóa</strong> theo quy trình bảo mật.</p>
          </Card>

          <Card id="s12" num="12" title="Thông Báo Vi Phạm Dữ Liệu" Icon={Icons.Bell}>
            <p>Nếu xảy ra vi phạm bảo mật dữ liệu, chúng tôi cam kết:</p>
            <div className="space-y-2">
              <Item><strong className="text-foreground">Thông báo cơ quan chức năng</strong> trong vòng 72 giờ kể từ khi phát hiện, theo quy định pháp luật Việt Nam.</Item>
              <Item><strong className="text-foreground">Thông báo người dùng bị ảnh hưởng</strong> qua email và thông báo nổi bật trên website kịp thời.</Item>
              <Item>Mô tả rõ bản chất vi phạm, loại dữ liệu bị ảnh hưởng và <strong className="text-foreground">các biện pháp khắc phục</strong> đã thực hiện.</Item>
            </div>
            <Alert kind="warn">Nếu bạn phát hiện rủi ro bảo mật, liên hệ ngay: <strong className="text-foreground">contact@arexnetwork.site</strong></Alert>
          </Card>

          <Card id="s13" num="13" title="Giải Quyết Tranh Chấp" Icon={Icons.Court}>
            <p>Nếu có khiếu nại, liên hệ với chúng tôi trước — cam kết giải quyết trong <strong className="text-foreground">30 ngày làm việc</strong>.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary dark:text-amber-400">Liên hệ Arex</p>
                <p className="text-sm font-semibold text-foreground">contact@arexnetwork.site</p>
                <p className="mt-0.5 text-xs">Phản hồi trong 15 ngày làm việc</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary dark:text-amber-400">Cơ quan chức năng</p>
                <p className="text-sm font-semibold text-foreground">Cục An toàn Thông tin — Bộ TT&TT</p>
                <p className="mt-0.5 text-xs">PA03 — Bộ Công an (nếu cần thiết)</p>
              </div>
            </div>
            <p className="text-xs">Tranh chấp được giải quyết theo <strong className="text-foreground">pháp luật Cộng hòa XHCN Việt Nam</strong> tại tòa án có thẩm quyền.</p>
          </Card>

          <Card id="s14" num="14" title="Miễn Trừ Trách Nhiệm" Icon={Icons.AlertTriangle}>
            <p>Arex không chịu trách nhiệm trong các trường hợp:</p>
            <div className="space-y-2">
              {[
                "Rò rỉ thông tin do lỗi phía người dùng — chia sẻ mật khẩu, sử dụng thiết bị không bảo mật.",
                "Hành vi và nội dung của trang web bên thứ ba qua liên kết từ website chúng tôi.",
                "Mất mát dữ liệu do sự kiện bất khả kháng — thiên tai, tấn công mạng quy mô lớn từ bên ngoài.",
                "Thông tin người dùng tự nguyện công khai trong bình luận hoặc bài đăng trên website.",
              ].map((t) => <Item key={t}>{t}</Item>)}
            </div>
          </Card>

          <Card id="s15" num="15" title="Thay Đổi Chính Sách" Icon={Icons.Edit}>
            <p>Arex có quyền cập nhật chính sách này theo thời gian. Khi có thay đổi quan trọng:</p>
            <div className="space-y-2">
              <Item>Cập nhật ngày hiệu lực ở đầu trang ngay lập tức.</Item>
              <Item>Thông báo trên website ít nhất <strong className="text-foreground">7 ngày</strong> trước khi thay đổi có hiệu lực.</Item>
              <Item>Gửi email thông báo đến người dùng đã đăng ký với các thay đổi quan trọng.</Item>
            </div>
            <Alert kind="info">Việc tiếp tục sử dụng website sau ngày hiệu lực đồng nghĩa bạn <strong className="text-foreground">chấp nhận chính sách đã sửa đổi</strong>.</Alert>
          </Card>

          {/* Legal References */}
          <Reveal once delay={0.1} distance={20} duration={0.58}>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)] md:p-7">
            <p className="mb-6 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60">Văn Bản Pháp Luật Tham Khảo — Nguồn: CSDL Quốc Gia Về VBPL (vbpl.vn)</p>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">Nhấn vào từng mục để sao chép tên văn bản. Hệ thống sẽ không mở liên kết ra ngoài.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {LEGAL_REFS.map((ref) => <CopyableLegalLink key={ref.label} label={ref.label} url={ref.url} />)}
            </div>
          </div>
          </Reveal>

        </div>
      </div>

      {/* Footer nav */}
      <Reveal once delay={0.12} distance={18} duration={0.56}>
      <div className="mt-7 rounded-2xl border border-border bg-card p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)] md:mt-8">
        <p className="mb-3 text-xs text-muted-foreground">Xem thêm tài liệu pháp lý của Arex</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/terms-of-use" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary dark:hover:border-amber-400 dark:hover:text-amber-400 hover:shadow-sm">
            <Icons.Scale /> Điều Khoản Sử Dụng
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary dark:hover:border-amber-400 dark:hover:text-amber-400 hover:shadow-sm">
            <Icons.Bell /> Liên Hệ Chúng Tôi
          </Link>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/40">© 2026 Arex · Chính Sách Bảo Mật v2.0 · Hiệu lực 02/04/2026 · Font: GFF Latin™ Garena Free Fire</p>
      </div>
      </Reveal>
    </div>
  );
}
