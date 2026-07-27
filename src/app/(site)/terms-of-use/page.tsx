import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { CopyableLegalLink } from "../../../components/CopyableLegalLink";
import { Reveal } from "@/components/common/reveal";
import { PageContentOverride } from "@/components/common/page-content-override";
import { siteConfig } from "@/lib/constants/site";

// Admin có thể thay nội dung ở /admin/page-content.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Điều Khoản Sử Dụng",
  description:
    "Điều khoản sử dụng của Arex — quyền và nghĩa vụ người dùng, bản quyền nội dung, xử lý vi phạm theo Luật Sở hữu trí tuệ và pháp luật Việt Nam.",
  alternates: { canonical: `${siteConfig.url}/terms-of-use` },
  openGraph: {
    title: "Điều Khoản Sử Dụng",
    description: "Điều khoản sử dụng của Arex — quyền và nghĩa vụ người dùng, bản quyền nội dung, xử lý vi phạm theo Luật Sở hữu trí tuệ và pháp luật Việt Nam.",
    url: `${siteConfig.url}/terms-of-use`,
    type: "website",
    siteName: siteConfig.name,
  },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Document: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Copyright: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.83 14.83a4 4 0 1 1 0-5.66" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ShieldOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18" />
      <path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  AlertOctagon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Link2: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  RefreshCw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Scale: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="12" y1="3" x2="12" y2="20" /><path d="M5 20h14" /><path d="M3 6l9-3 9 3" />
      <path d="M3 6l3 6c0 1.66-1.34 3-3 3s-3-1.34-3-3l3-6z" />
      <path d="M21 6l3 6c0 1.66-1.34 3-3 3s-3-1.34-3-3l3-6z" />
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 inline-block ml-1 flex-shrink-0">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary dark:text-amber-400">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 flex-shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

const LEGAL_REFS = [
  { label: "Luật Sở hữu trí tuệ 2005 (sửa đổi 2022 - 07/2022/QH15)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=07/2022/QH15" },
  { label: "Nghị định 17/2023/NĐ-CP (Quy định chi tiết Luật SHTT)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=17/2023/NĐ-CP" },
  { label: "Nghị định 72/2013/NĐ-CP (Quản lý Internet và MXH)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=72/2013/NĐ-CP" },
  { label: "Luật An toàn thông tin mạng 2015 (86/2015/QH13)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=86/2015/QH13" },
  { label: "Luật An ninh mạng 2018 (24/2018/QH14)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=24/2018/QH14" },
  { label: "Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=13/2023/NĐ-CP" },
  { label: "Luật Giao dịch điện tử 2023 (20/2023/QH15)", url: "https://vbpl.vn/pages/vbpq-timkiem.aspx?Keyword=20/2023/QH15" },
];

const TOC = [
  { id: "s1",  num: "01", title: "Giới Thiệu & Chấp Nhận",   Icon: Icons.Document },
  { id: "s2",  num: "02", title: "Giải Thích Thuật Ngữ",     Icon: Icons.BookOpen },
  { id: "s3",  num: "03", title: "Quyền & Nghĩa Vụ Arex",     Icon: Icons.Building },
  { id: "s4",  num: "04", title: "Quyền & Nghĩa Vụ Người Dùng",Icon: Icons.Users },
  { id: "s5",  num: "05", title: "Bản Quyền Nội Dung",        Icon: Icons.Copyright },
  { id: "s6",  num: "06", title: "Xử Lý Vi Phạm Bản Quyền",  Icon: Icons.Search },
  { id: "s7",  num: "07", title: "Hành Vi Cấm & Chế Tài",     Icon: Icons.ShieldOff },
  { id: "s8",  num: "08", title: "Miễn Trừ Trách Nhiệm",      Icon: Icons.AlertOctagon },
  { id: "s9",  num: "09", title: "Liên Kết Bên Thứ Ba",        Icon: Icons.Link2 },
  { id: "s10", num: "10", title: "Sửa Đổi Điều Khoản",        Icon: Icons.RefreshCw },
  { id: "s11", num: "11", title: "Giải Quyết Tranh Chấp",     Icon: Icons.Scale },
  { id: "s12", num: "12", title: "Thông Tin Liên Hệ",          Icon: Icons.Mail },
];

function Card({ id, num, title, Icon, tag, tagColor = "blue", children }: {
  id: string; num: string; title: string; Icon: () => ReactElement;
  tag?: string; tagColor?: "blue" | "amber" | "red" | "green";
  children: React.ReactNode;
}) {
  const revealDelay = Math.min((Number(num) - 1) * 0.025, 0.16);
  const tagCls: Record<string, string> = {
    blue:  "border-primary/20 bg-primary/5 text-primary dark:border-amber-400/20 dark:bg-amber-400/5 dark:text-amber-400",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-300",
    red:   "border-red-500/25 bg-red-500/5 text-red-600 dark:text-red-400",
    green: "border-green-500/25 bg-green-500/5 text-green-600 dark:text-green-400",
  };
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
                <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest md:text-xs ${tagCls[tagColor]}`}>
                  <Icons.Scale /><span>{tag}</span>
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

function ForbiddenItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-[15px] leading-7 transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-red-500/30 hover:shadow-sm md:px-5 md:py-4 md:text-[15px] xl:text-[16px] xl:leading-7">
      <Icons.XCircle />
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
      {title && <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground md:text-sm"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-black">{icons[kind]}</span>{title}</p>}
      <p className={`text-[15px] leading-7 text-muted-foreground md:text-[15px] xl:text-[16px] xl:leading-7${!title ? " flex items-start gap-3" : ""}`}>{children}</p>
    </div>
  );
}

export default function TermsOfUsePage() {
  return (
    <div className="relative left-1/2 right-1/2 mx-auto w-[calc(100vw-1rem)] max-w-[2150px] -translate-x-1/2 px-4 pt-8 pb-24 md:w-[calc(100vw-2.5rem)] md:px-8 md:pt-14 xl:w-[calc(100vw-4rem)] xl:px-12 2xl:px-16">

      {/* Hero */}
      <Reveal once distance={18} duration={0.65}>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border shadow-[0_20px_48px_rgba(15,23,42,0.08)] md:mb-7">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0014] via-[#1a0028] to-[#1a0900]" />
        <div aria-hidden className="policy-hero-orb pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-orange-600/20 blur-[100px]" />
        <div aria-hidden className="policy-hero-orb policy-hero-orb--slow pointer-events-none absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-amber-500/15 blur-[80px]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 24px)" }} />
        <div className="relative z-10 px-6 py-12 text-center md:px-16 md:py-16 lg:px-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
            Tài liệu pháp lý chính thức · Arex
          </div>
          <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-[0.08em] text-white drop-shadow-lg md:text-5xl xl:text-6xl">
            Điều Khoản<br className="hidden sm:block" /> Sử Dụng
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/55 md:text-[15px]">
            Bằng cách truy cập <span className="font-semibold text-white">Arex</span>, bạn đồng ý tuân thủ toàn bộ điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng website ngay.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {["Hiệu lực: 02/04/2026","Phiên bản 2.0","Pháp luật Việt Nam","Luật SHTT 2005"].map((l) => (
              <span key={l} className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] tracking-wide text-white/40">{l}</span>
            ))}
          </div>
        </div>
      </div>
      </Reveal>

      {/* Quick Info */}
      <Reveal once delay={0.04} distance={20} duration={0.58}>
      <div className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)] md:mb-7 md:p-7">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 md:text-sm">Thông Tin Điều Khoản</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Bên cung cấp","Arex"],
            ["Email pháp lý","contact@arexnetwork.site"],
            ["Ngày hiệu lực","02/04/2026"],
            ["Văn bản chính","Luật SHTT · NĐ 17/2023 · NĐ 72/2013"],
            ["Phạm vi","Mọi người dùng truy cập Arex"],
            ["Quan trọng","Arex ≠ Garena"],
          ].map(([l,v]) => (
            <div key={l} className="policy-interactive-card rounded-2xl border border-border/60 bg-background/60 p-5 shadow-sm backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow,filter] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md hover:brightness-[1.01] dark:hover:border-amber-400/20 md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground/50 md:text-sm">{l}</p>
              <p className="mt-2 text-base font-bold leading-snug text-foreground md:text-lg xl:text-[19px]">{v}</p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      <PageContentOverride pageKey="terms-of-use">
      {/* Layout */}
      <div className="space-y-6 xl:space-y-7 2xl:grid 2xl:grid-cols-[18rem_minmax(0,1fr)] 2xl:items-start 2xl:gap-7 2xl:space-y-0">

        {/* Sidebar TOC - Chỉ hiện trên màn hình rất rộng để phần nội dung chính thoáng hơn */}
        <Reveal once delay={0.08} distance={22} duration={0.58}>
        <aside className="hidden 2xl:block 2xl:sticky 2xl:top-24 2xl:w-full 2xl:self-start">
          <nav className="rounded-3xl border border-border bg-card/95 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-sm" aria-label="Mục lục điều khoản sử dụng">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground/50">Mục Lục</p>
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

          <Card id="s1" num="01" title="Giới Thiệu & Chấp Nhận Điều Khoản" Icon={Icons.Document}>
            <p>
              <strong className="text-foreground">Arex</strong> là dự án cộng đồng phi lợi nhuận chuyên cung cấp tin tức, lịch sự kiện và nội dung liên quan đến game <strong className="text-foreground">Free Fire</strong> tại Việt Nam. Website thuộc sở hữu và vận hành bởi cộng đồng Arex, không phải đại diện chính thức của Garena.
            </p>
            <Alert kind="warn" title="Tuyên bố quan trọng — Arex ≠ Garena">
              Arex <strong className="text-foreground">KHÔNG phải là Garena</strong> và không có liên kết chính thức, quan hệ đối tác hay đại diện với Garena Free Fire, Sea Ltd. hay bất kỳ tổ chức phát hành game nào. Mọi thương hiệu và tài sản game thuộc sở hữu của các chủ sở hữu tương ứng.
            </Alert>
            <p>
              Khi truy cập website, bạn đồng ý bị ràng buộc bởi các Điều khoản này và{" "}
              <Link href="/privacy-policy" className="text-primary underline underline-offset-2 dark:text-amber-400">Chính sách Bảo mật</Link>.
              Nếu bạn là người dưới 18 tuổi, cần có sự giám sát của người giám hộ khi sử dụng các tính năng tương tác.
            </p>
          </Card>

          <Card id="s2" num="02" title="Giải Thích Thuật Ngữ" Icon={Icons.BookOpen}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['"Arex"', 'Tổ chức cộng đồng vận hành website. "Chúng tôi" trong tài liệu = Arex.'],
                ['"Website"', "Toàn bộ trang tại miền arexnetwork.site và các miền con liên quan."],
                ['"Người dùng"', "Bất kỳ cá nhân nào truy cập, sử dụng hoặc tương tác với Website."],
                ['"Nội dung"', "Văn bản, hình ảnh, video, âm thanh và mọi tài liệu đăng trên Website."],
                ['"Nội dung ND"', "Mọi nội dung do người dùng tự tạo và đăng tải (bình luận, hình ảnh...)."],
                ['"Bên thứ ba"', "Tổ chức, cá nhân không phải Arex — Garena, đối tác, người dùng khác."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-primary dark:text-amber-400">{t}</p>
                  <p className="text-sm leading-relaxed md:text-[15px]">{d}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card id="s3" num="03" title="Quyền & Nghĩa Vụ Của Arex" Icon={Icons.Building} tag="Minh bạch">
            <p className="font-semibold text-foreground">Arex có quyền:</p>
            <div className="space-y-2">
              <Item>Chỉnh sửa, cập nhật, thêm bớt nội dung trên website bất kỳ lúc nào.</Item>
              <Item>Tạm dừng hoặc chấm dứt một số tính năng hoặc toàn bộ dịch vụ khi cần.</Item>
              <Item>Xóa nội dung người dùng vi phạm Điều khoản mà không cần thông báo trước.</Item>
              <Item>Thu hồi quyền truy cập của người dùng vi phạm nghiêm trọng.</Item>
            </div>
            <p className="font-semibold text-foreground mt-1">Arex có nghĩa vụ:</p>
            <div className="space-y-2">
              <Item>Quản lý nội dung tổ chức đăng tải theo đúng quy định pháp luật Việt Nam.</Item>
              <Item>Bảo mật dữ liệu cá nhân người dùng theo Chính sách Bảo mật đã công bố.</Item>
              <Item>Thông báo trước khi có thay đổi quan trọng về dịch vụ hoặc điều khoản.</Item>
              <Item>Xử lý kịp thời các báo cáo vi phạm bản quyền và yêu cầu gỡ bỏ hợp lệ.</Item>
            </div>
          </Card>

          <Card id="s4" num="04" title="Quyền & Nghĩa Vụ Của Người Dùng" Icon={Icons.Users} tag="Bắt buộc tuân thủ" tagColor="amber">
            <p className="font-semibold text-foreground">Người dùng có quyền:</p>
            <div className="space-y-2">
              <Item>Truy cập và đọc toàn bộ nội dung tin tức, sự kiện mà không cần đăng ký.</Item>
              <Item>Yêu cầu Arex chỉnh sửa hoặc xóa nội dung cá nhân mà bạn đã đăng tải.</Item>
              <Item>Báo cáo nội dung vi phạm qua email <strong className="text-foreground">contact@arexnetwork.site</strong>.</Item>
              <Item>Khiếu nại và yêu cầu giải thích về quyết định xóa nội dung của bạn.</Item>
            </div>
            <p className="font-semibold text-foreground mt-1">Người dùng có nghĩa vụ:</p>
            <div className="space-y-2">
              <Item>Cung cấp thông tin chính xác khi đăng ký, liên hệ hoặc gửi biểu mẫu.</Item>
              <Item>Bảo mật thông tin tài khoản và chịu trách nhiệm về mọi hoạt động từ tài khoản.</Item>
              <Item>Tuân thủ pháp luật Việt Nam và Điều khoản này khi sử dụng website.</Item>
              <Item>Chỉ đăng tải nội dung mà bạn là tác giả hoặc đã được cấp phép sử dụng hợp lệ.</Item>
              <Item>Tôn trọng người dùng khác — không quấy rối, phân biệt đối xử hay gây thù ghét.</Item>
            </div>
          </Card>

          <Card id="s5" num="05" title="Quy Định Bản Quyền Nội Dung" Icon={Icons.Copyright} tag="Luật SHTT 2005 (sửa đổi)">
            <Alert kind="info" title="Cơ sở pháp lý">
              Nội dung được bảo hộ theo <em>Luật Sở hữu trí tuệ 2005</em> và các văn bản sửa đổi. Vi phạm có thể bị phạt hành chính tùy theo mức độ vi phạm quy định tại <em>Nghị định 17/2023/NĐ-CP</em>.
            </Alert>
            <p className="font-semibold text-foreground">A — Nội dung do Arex tạo ra:</p>
            <div className="space-y-2">
              <Item><strong className="text-foreground">Bảo hộ bản quyền:</strong> Bài viết, thiết kế, hình ảnh tự sản xuất thuộc quyền sở hữu của Arex.</Item>
              <Item>Bạn được phép đọc và chia sẻ <strong className="text-foreground">liên kết (URL)</strong>. Sao chép toàn bộ mà không ghi nguồn là vi phạm.</Item>
              <Item>Trích dẫn ≤ 30% với ghi nguồn rõ ràng được phép theo <em>Điều 25, Luật SHTT</em>.</Item>
            </div>
            <p className="font-semibold text-foreground">B — Nội dung từ Garena & tổ chức giải đấu:</p>
            <div className="space-y-2">
              <Item>Thương hiệu, logo, nhân vật game thuộc <strong className="text-foreground">Garena / Sea Limited</strong>. Arex không xác nhận quyền sở hữu.</Item>
              <Item>Khi sử dụng ảnh/video Garena, chúng tôi luôn ghi nguồn rõ ràng theo quy định pháp luật.</Item>
              <Item>Khi nhận yêu cầu gỡ bỏ hợp lệ từ chủ sở hữu, Arex thực hiện trong vòng <strong className="text-foreground">24 giờ</strong>.</Item>
            </div>
            <p className="font-semibold text-foreground">C — So sánh phương án xử lý bản quyền:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm md:text-base mt-2">
                <thead>
                  <tr>{["Phương án","Chi phí","Rủi ro pháp lý"].map((h) => (
                    <th key={h} className="border border-border/60 bg-muted/40 px-4 py-3 text-left font-bold uppercase tracking-wide text-foreground">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[
                    ["① Xin phép sử dụng","Trung bình (có thể miễn phí)","🟢 Thấp"],
                    ["② Mua bản quyền","Cao (tài chính)","🟢 Rất thấp"],
                    ["③ Trích dẫn hợp lệ Đ.25","Thấp (công sức)","🟡 Trung bình — cần đủ điều kiện"],
                    ["④ Gỡ bỏ nội dung","Gần như không","🟢 Không còn rủi ro"],
                  ].map(([p,c,r]) => (
                    <tr key={p} className="hover:bg-muted/20 transition-colors">
                      <td className="border border-border/60 px-4 py-3 font-medium text-foreground">{p}</td>
                      <td className="border border-border/60 px-4 py-3">{c}</td>
                      <td className="border border-border/60 px-4 py-3">{r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card id="s6" num="06" title="Xử Lý Vi Phạm Bản Quyền Bên Thứ Ba" Icon={Icons.Search} tag="NĐ 72/2013" tagColor="amber">
            <p>Quy trình 6 bước khi nhận thông báo vi phạm bản quyền:</p>
            <div className="space-y-3 mt-1">
              {[
                ["01","Tiếp nhận","Nhận báo cáo qua contact@arexnetwork.site và lập biên bản tiếp nhận ngay."],
                ["02","Xác minh ban đầu","Kiểm tra tính hợp lệ và so sánh với nội dung đang hiển thị trên website."],
                ["03","Hành động tạm","Nếu có bằng chứng rõ ràng: gỡ bỏ hoặc ẩn nội dung trong tối đa 24 giờ."],
                ["04","Xác minh chi tiết","Nếu không vi phạm (trích dẫn hợp lý theo Điều 25 SHTT), phản hồi giải thích."],
                ["05","Gỡ bỏ triệt để","Nếu xác nhận vi phạm: gỡ bỏ triệt để và liên hệ xin phép hoặc thay thế."],
                ["06","Lưu hồ sơ","Lưu toàn bộ biên bản, email và quyết định xử lý làm bằng chứng pháp lý."],
              ].map(([step, t, d]) => (
                <div key={step} className="flex gap-4 rounded-xl border border-border/60 bg-background/50 px-5 py-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/5 dark:border-amber-400/25 dark:bg-amber-400/5">
                    <span className="text-xs font-black text-primary dark:text-amber-400">{step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-foreground">{t}</p>
                    <p className="mt-1 text-sm leading-relaxed md:text-[15px]">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <Alert kind="info" title="Gửi thông báo vi phạm bản quyền">
              Email: <strong className="text-foreground">contact@arexnetwork.site</strong> — kèm theo: (a) thông tin liên hệ, (b) URL nội dung vi phạm, (c) bằng chứng quyền sở hữu, (d) yêu cầu cụ thể.
            </Alert>
          </Card>

          <Card id="s7" num="07" title="Hành Vi Bị Cấm & Chế Tài" Icon={Icons.ShieldOff} tag="Nghiêm cấm" tagColor="red">
            <p>Các hành vi sau đây bị <strong className="text-foreground">nghiêm cấm</strong> khi sử dụng Arex:</p>
            <div className="space-y-2">
              <ForbiddenItem><strong className="text-foreground">Vi phạm bản quyền:</strong> Sao chép, tái phân phối nội dung không có sự cho phép hợp lệ.</ForbiddenItem>
              <ForbiddenItem><strong className="text-foreground">Nội dung bất hợp pháp:</strong> Đăng tải nội dung khiêu dâm, bạo lực, kích động thù hận vi phạm pháp luật Việt Nam.</ForbiddenItem>
              <ForbiddenItem><strong className="text-foreground">Tấn công hệ thống:</strong> Xâm nhập trái phép, DDoS, scraping không phép hoặc phát tán mã độc.</ForbiddenItem>
              <ForbiddenItem><strong className="text-foreground">Thông tin sai lệch:</strong> Đăng tải thông tin giả mạo gây hiểu lầm hoặc làm tổn hại đến uy tín tổ chức, cá nhân khác.</ForbiddenItem>
              <ForbiddenItem><strong className="text-foreground">Spam & lạm dụng:</strong> Gửi liên tục tin nhắn không mong muốn hoặc sử dụng bot tự động.</ForbiddenItem>
              <ForbiddenItem><strong className="text-foreground">Giả mạo danh tính:</strong> Mạo danh Arex, nhân viên Arex hoặc bất kỳ tổ chức, cá nhân khác.</ForbiddenItem>
            </div>
            <p className="font-semibold text-foreground">Chế tài xử lý:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[["①","Cảnh cáo lần đầu","Thông báo và yêu cầu chỉnh sửa trong thời hạn quy định."],["②","Xóa nội dung vi phạm","Gỡ bỏ ngay lập tức mà không cần thông báo trước."],["③","Khóa / vô hiệu hóa TK","Vi phạm nghiêm trọng hoặc tái phạm nhiều lần."],["④","Báo cơ quan chức năng","Các hành vi vi phạm pháp luật hình sự Việt Nam."]].map(([n,t,d]) => (
                <div key={n} className="flex items-start gap-4 rounded-xl border border-border/60 bg-background/50 px-5 py-4">
                  <span className="font-black text-primary dark:text-amber-400 flex-shrink-0">{n}</span>
                  <div><p className="text-sm font-bold uppercase tracking-wide text-foreground">{t}</p><p className="mt-1 text-sm leading-relaxed md:text-[15px]">{d}</p></div>
                </div>
              ))}
            </div>
            <Alert kind="danger">Vi phạm bản quyền có thể bị xử lý khắc phục hậu quả hoặc phạt hành chính theo <em>Nghị định 17/2023/NĐ-CP</em> và các văn bản liên quan.</Alert>
          </Card>

          <Card id="s8" num="08" title="Miễn Trừ Trách Nhiệm" Icon={Icons.AlertOctagon}>
            <div className="space-y-2">
              <Item><strong className="text-foreground">Độ chính xác nội dung:</strong> Thông tin sự kiện, lịch game có thể thay đổi — luôn tham khảo kênh chính thức của nhà phát hành.</Item>
              <Item><strong className="text-foreground">Liên kết bên ngoài:</strong> Không chịu trách nhiệm về nội dung và chính sách của trang web bên thứ ba.</Item>
              <Item><strong className="text-foreground">Gián đoạn dịch vụ:</strong> Website có thể tạm không khả dụng do bảo trì, sự cố kỹ thuật hoặc bất khả kháng.</Item>
              <Item><strong className="text-foreground">Nội dung người dùng:</strong> Arex không chịu trách nhiệm về nội dung do người dùng tạo ra.</Item>
              <Item><strong className="text-foreground">Thiệt hại gián tiếp:</strong> Mất mát dữ liệu, lợi nhuận từ việc sử dụng hoặc không thể sử dụng website.</Item>
            </div>
          </Card>

          <Card id="s9" num="09" title="Liên Kết & Dịch Vụ Bên Thứ Ba" Icon={Icons.Link2}>
            <div className="space-y-2">
              <Item>Trang chính thức của Garena Free Fire và các giải đấu Esports.</Item>
              <Item>Kênh mạng xã hội của Arex (Facebook, YouTube, TikTok v.v.).</Item>
              <Item>Nguồn tin tức và tài liệu tham khảo từ cộng đồng game thủ.</Item>
            </div>
            <Alert kind="warn">Arex <strong className="text-foreground">không kiểm soát và không chịu trách nhiệm</strong> về nội dung, chính sách bảo mật hay thực tiễn của bất kỳ trang web bên thứ ba nào.</Alert>
          </Card>

          <Card id="s10" num="10" title="Sửa Đổi Điều Khoản" Icon={Icons.RefreshCw}>
            <p>Arex bảo lưu quyền sửa đổi Điều khoản này. Khi có thay đổi quan trọng:</p>
            <div className="space-y-2">
              <Item>Cập nhật ngày hiệu lực ở đầu tài liệu ngay lập tức.</Item>
              <Item>Thông báo rõ ràng trên website ít nhất <strong className="text-foreground">7 ngày</strong> trước khi có hiệu lực.</Item>
              <Item>Gửi email thông báo đến người dùng đã đăng ký với các thay đổi quan trọng.</Item>
            </div>
            <Alert kind="info">Việc tiếp tục sử dụng website sau ngày hiệu lực đồng nghĩa bạn <strong className="text-foreground">chấp nhận Điều khoản đã sửa đổi</strong>.</Alert>
          </Card>

          <Card id="s11" num="11" title="Giải Quyết Tranh Chấp" Icon={Icons.Scale} tag="Pháp luật Việt Nam">
            <p>Mọi tranh chấp được giải quyết theo các bước:</p>
            <div className="space-y-2">
              {[
                ["①","Thương lượng trực tiếp","Ưu tiên giải quyết thiện chí. Liên hệ contact@arexnetwork.site trong 30 ngày làm việc."],
                ["②","Hòa giải","Nếu thương lượng không thành, đề nghị hòa giải qua tổ chức có thẩm quyền."],
                ["③","Tòa án","Tranh chấp không giải quyết qua thương lượng đưa lên tòa án Việt Nam có thẩm quyền."],
              ].map(([n,t,d]) => (
                <div key={n} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 px-5 py-4">
                  <span className="flex-shrink-0 font-black text-primary dark:text-amber-400">{n}</span>
                  <p className="text-sm leading-relaxed md:text-[15px]"><strong className="text-foreground">{t}:</strong> {d}</p>
                </div>
              ))}
            </div>
            <Alert kind="info">Điều khoản điều chỉnh theo <strong className="text-foreground">pháp luật Cộng hòa XHCN Việt Nam</strong> — Luật An toàn TT mạng 2015, Luật SHTT 2005 và các văn bản hướng dẫn liên quan.</Alert>
          </Card>

          <Card id="s12" num="12" title="Thông Tin Liên Hệ" Icon={Icons.Mail}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["Pháp Lý & Bản Quyền","contact@arexnetwork.site","Vi phạm bản quyền, yêu cầu gỡ bỏ, khiếu nại pháp lý"],
                ["Bảo Mật Dữ Liệu","contact@arexnetwork.site","Báo cáo lỗ hổng bảo mật, vi phạm dữ liệu cá nhân"],
                ["Hỗ Trợ Chung","contact@arexnetwork.site","Câu hỏi chung, phản hồi, góp ý về website"],
                ["Thời Gian Phản Hồi","15 ngày làm việc","Khẩn cấp (vi phạm bản quyền): trong 24 giờ"],
              ].map(([b,e,d]) => (
                <div key={b} className="rounded-xl border border-border/60 bg-background/50 px-5 py-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-primary dark:text-amber-400">{b}</p>
                  <p className="text-sm font-semibold text-foreground md:text-[15px]">{e}</p>
                  <p className="mt-1 text-sm leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
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

      {/* Footer */}
      <Reveal once delay={0.12} distance={18} duration={0.56}>
      <div className="mt-7 rounded-2xl border border-border bg-card p-5 text-center shadow-[0_14px_32px_rgba(15,23,42,0.05)] md:mt-8">
        <p className="mb-3 text-xs text-muted-foreground">Xem thêm tài liệu pháp lý của Arex</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/privacy-policy" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary dark:hover:border-amber-400 dark:hover:text-amber-400 hover:shadow-sm">
            <Icons.Copyright /> Chính Sách Bảo Mật
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary dark:hover:border-amber-400 dark:hover:text-amber-400 hover:shadow-sm">
            <Icons.Mail /> Liên Hệ Chúng Tôi
          </Link>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/40">© 2026 Arex · Điều Khoản Sử Dụng v2.0 · Hiệu lực 02/04/2026 · Font: GFF Latin™ Garena Free Fire</p>
      </div>
      </Reveal>
      </PageContentOverride>
    </div>
  );
}
