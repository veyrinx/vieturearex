"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Menu, Search, House, CalendarDays, Flame, MonitorPlay,
  BookOpenText, Users, MessageSquare, Trophy,
  TrendingUp, Palette, Rss, Image as ImageIcon, Crosshair,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LanguageToggle } from "@/components/common/language-toggle";
import { PushNotificationButton } from "@/components/common/push-notification-button";
import { UserNavButton } from "@/components/common/user-nav-button";
import { NotificationBell } from "@/components/common/notification-bell";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navItems, siteConfig } from "@/lib/constants/site";
import { Info, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ABOUT_ITEMS = [
  { title: "Đội Ngũ",       href: "/team",    icon: Users, desc: "Thành viên vận hành Arex" },
  { title: "Về Chúng Tôi",  href: "/about",   icon: Info,  desc: "Câu chuyện & sứ mệnh" },
  { title: "Liên Hệ",       href: "/contact", icon: Mail,  desc: "Gửi phản hồi & hợp tác" },
];

const COMMUNITY_ITEMS = [
  { title: "Chỉnh Độ Nhạy",  href: "/do-nhay",               icon: Crosshair,     desc: "Công cụ gợi ý độ nhạy Free Fire" },
  { title: "Diễn Đàn",       href: "/cong-dong",             icon: MessageSquare, desc: "Thảo luận & chia sẻ" },
  { title: "Feed",            href: "/feed",                  icon: Rss,           desc: "Hoạt động từ người bạn theo dõi" },
  { title: "Wiki CĐ",        href: "/wiki",                  icon: BookOpenText,  desc: "Kiến thức do cộng đồng đóng góp" },
  { title: "Thư Viện Icon",  href: "/items",                 icon: ImageIcon,     desc: "Icon Free Fire (vũ khí, nhân vật, skin...)" },
  { title: "Xu Hướng",       href: "/cong-dong/xu-huong",    icon: TrendingUp,    desc: "Hot posts & top contributors" },
  { title: "Bình Chọn",      href: "/binh-chon",             icon: Trophy,        desc: "Nhân vật mạnh nhất" },
  { title: "Tuyển TV",       href: "/tuyen-thanh-vien",      icon: Users,         desc: "Tìm clan & guild" },
  { title: "Trang Cá Nhân",  href: "/cong-dong/cosmetics",   icon: Palette,       desc: "Khung & Danh Hiệu" },
];

// ── Mobile sheet nav — gom thành nhóm gọn ───────────────────────────────────
const MOBILE_NAV_SECTIONS: {
  label: string;
  items: { title: string; href: string; icon: LucideIcon }[];
}[] = [
  {
    label: "Chính",
    items: [
      { title: "Trang Chủ", href: "/",     icon: House },
      { title: "Tin Tức",   href: "/news", icon: BookOpenText },
    ],
  },
  {
    label: "Khám Phá",
    items: [
      { title: "Lịch",     href: "/calendar", icon: CalendarDays },
      { title: "Sự Kiện",  href: "/events",   icon: Flame },
      { title: "Trực Tiếp", href: "/esports", icon: MonitorPlay },
    ],
  },
  {
    label: "Cộng Đồng",
    items: COMMUNITY_ITEMS.map(({ title, href, icon }) => ({ title, href, icon })),
  },
  {
    label: "Giới Thiệu",
    items: ABOUT_ITEMS.map(({ title, href, icon }) => ({ title, href, icon })),
  },
];

const DEFAULT_SITE_NAME = siteConfig.shortName;

const ICON_LIGHT_DEFAULT =
  "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035";
const ICON_DARK_DEFAULT =
  "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441";

type SiteNavbarProps = {
  logoLight?: string;
  logoDark?: string;
  siteName?: string;
};

// ── Generic nav dropdown (desktop) ──────────────────────────────────────────
type NavDropdownItem = { title: string; href: string; icon: LucideIcon; desc: string };

function NavDropdown({
  label, items, headerLabel, layoutId, panelClassName, pathname, isHomePage, onNavigate,
}: {
  label: string;
  items: NavDropdownItem[];
  headerLabel: string;
  layoutId: string;
  panelClassName?: string;
  pathname: string;
  isHomePage: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isCommunityActive = items.some((item) => pathname.startsWith(item.href));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex items-center gap-1 rounded-lg px-3 py-1.5 text-[clamp(0.6rem,1.1vw,0.68rem)] font-bold uppercase tracking-[0.08em] transition-all duration-150 whitespace-nowrap",
          isHomePage
            ? "text-slate-600 hover:bg-black/5 hover:text-slate-950 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          isCommunityActive &&
            (isHomePage
              ? "text-primary dark:text-amber-300"
              : "bg-primary/8 text-primary dark:bg-amber-400/8 dark:text-amber-300"),
        )}
      >
        <span>{label}</span>
        {/* CSS border chevron — clearly an icon, not a letter */}
        <span
          aria-hidden="true"
          className={cn(
            "ml-0.5 inline-block shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          style={{
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "5px solid currentColor",
            opacity: 0.7,
            marginBottom: "1px",
          }}
        />
        {isCommunityActive && (
          <motion.span
            layoutId={layoutId}
            className="absolute -bottom-[1px] left-2.5 right-2.5 h-[2px] rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] dark:from-amber-400 dark:to-orange-400"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn("absolute left-0 top-full z-[60] pt-2", panelClassName ?? "w-72")}
          >
            {/* Inner card — pt-2 above creates the invisible bridge so mouse can move
                from trigger to dropdown without triggering mouseLeave */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
              {/* Header strip */}
              <div className="border-b border-border/50 px-4 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  {headerLabel}
                </p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-1.5 space-y-0.5">
                {items.map(({ title, href, icon: Icon, desc }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => { setOpen(false); onNavigate?.(); }}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        active
                          ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-300"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                        active
                          ? "bg-primary/15 dark:bg-amber-400/15"
                          : "bg-muted group-hover:bg-primary/10 dark:group-hover:bg-amber-400/10",
                      )}>
                        <Icon className={cn("size-4", active ? "text-primary dark:text-amber-400" : "text-muted-foreground group-hover:text-primary dark:group-hover:text-amber-400")} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight truncate">{title}</p>
                        <p className="text-[10px] leading-tight text-muted-foreground truncate">{desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main navbar ──────────────────────────────────────────────────────────────
export function SiteNavbar({ logoLight, logoDark, siteName = DEFAULT_SITE_NAME }: SiteNavbarProps) {
  const iconLight = logoLight || ICON_LIGHT_DEFAULT;
  const iconDark = logoDark || ICON_DARK_DEFAULT;
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const isHomePage = pathname === "/";

  useEffect(() => {
    let prev = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 56)         setCompact(false);
      else if (y > prev + 6) setCompact(true);
      else if (prev > y + 6) setCompact(false);
      prev = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctrlClass =
    "theme-control-surface border-slate-200/90 bg-white/84 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-[#0F1115]/72 dark:text-white dark:hover:bg-[#151820]";

  return (
    <header
      style={{ top: "var(--banner-h, 0px)", transition: "top 0.22s cubic-bezier(0.4,0,0.2,1)" }}
      className={cn(
        "z-50 backdrop-blur-xl",
        isHomePage
          ? "fixed inset-x-0 bg-white/72 shadow-[0_8px_24px_rgba(15,23,42,0.07)] dark:bg-slate-950/42 dark:shadow-none"
          : "sticky border-b border-border bg-background/90",
      )}
    >
      <motion.div
        animate={{ height: compact ? 44 : 64 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 md:px-6"
      >

        {/* ── Logo ── */}
        <Link
          href="/"
          aria-label={siteName}
          className="flex shrink-0 items-center gap-2.5"
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <Image
              src={iconLight}
              alt={siteName}
              width={36}
              height={36}
              priority
              className="block size-9 object-contain drop-shadow-[0_6px_18px_rgba(15,23,42,0.18)] dark:hidden"
            />
            <Image
              src={iconDark}
              alt={siteName}
              width={36}
              height={36}
              priority
              className="hidden size-9 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.38)] dark:block"
            />
          </motion.div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-heading text-[0.72rem] font-black uppercase tracking-[0.14em] text-foreground">
              {siteName}
            </span>
            <motion.span
              animate={{ opacity: compact ? 0 : 1, height: compact ? 0 : "auto" }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted-foreground"
            >
              Community Hub
            </motion.span>
          </div>
        </Link>

        {/* ── Nav links (desktop center) ── */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {/* TRANG CHỦ → TIN TỨC */}
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[clamp(0.6rem,1.1vw,0.68rem)] font-bold uppercase tracking-[0.08em] transition-all duration-150 whitespace-nowrap",
                  isHomePage
                    ? "text-slate-600 hover:bg-black/5 hover:text-slate-950 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  active &&
                    (isHomePage
                      ? "text-primary dark:text-amber-300"
                      : "bg-primary/8 text-primary dark:bg-amber-400/8 dark:text-amber-300"),
                )}
              >
                {item.title}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-[1px] left-2.5 right-2.5 h-[2px] rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] dark:from-amber-400 dark:to-orange-400"
                  />
                )}
              </Link>
            );
          })}

          {/* Community dropdown */}
          <NavDropdown
            label="Cộng Đồng"
            items={COMMUNITY_ITEMS}
            headerLabel="Cộng Đồng Arex Network"
            layoutId="nav-underline-community"
            pathname={pathname}
            isHomePage={isHomePage}
          />

          {/* Giới thiệu dropdown (Đội Ngũ / Về Chúng Tôi / Liên Hệ) */}
          <NavDropdown
            label="Giới Thiệu"
            items={ABOUT_ITEMS}
            headerLabel="Về Arex Network"
            layoutId="nav-underline-about"
            panelClassName="w-64"
            pathname={pathname}
            isHomePage={isHomePage}
          />
        </nav>

        {/* ── Controls ── */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
          <Link
            href="/search"
            aria-label="Tìm kiếm"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-xl transition-colors",
              isHomePage ? ctrlClass : "theme-control-surface",
            )}
          >
            <Search className="size-[17px]" />
          </Link>
          <UserNavButton className={isHomePage ? ctrlClass : undefined} />
          {/* Hide extra icons on mobile — moved into sheet */}
          <span className="hidden md:contents">
            <LanguageToggle className={isHomePage ? ctrlClass : "theme-control-surface"} />
            <NotificationBell className={isHomePage ? ctrlClass : undefined} />
            <PushNotificationButton className={isHomePage ? ctrlClass : undefined} />
            <ThemeToggle className={isHomePage ? ctrlClass : undefined} />
          </span>

          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-xl md:hidden",
                isHomePage ? ctrlClass : "theme-control-surface",
              )}
            >
              <Menu className="size-5" />
            </SheetTrigger>

            <SheetContent
              side="right"
              className="flex w-72 max-w-[85vw] flex-col gap-0 overflow-hidden rounded-l-[28px] border-l border-border/60 bg-card/95 p-0 text-foreground shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
            >
              {/* Brand header */}
              <div className="relative flex items-center gap-3 border-b border-border/60 bg-gradient-to-br from-primary/8 to-transparent px-4 py-4 dark:from-amber-400/8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-amber-400/40" />
                <Image
                  src={iconLight}
                  alt={siteName}
                  width={38}
                  height={38}
                  className="block size-9 shrink-0 rounded-xl object-contain dark:hidden"
                />
                <Image
                  src={iconDark}
                  alt={siteName}
                  width={38}
                  height={38}
                  className="hidden size-9 shrink-0 rounded-xl object-contain dark:block"
                />
                <div className="min-w-0 leading-none">
                  <SheetTitle className="font-heading text-sm font-black uppercase tracking-[0.12em] text-foreground">
                    {siteName}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Community Hub
                  </SheetDescription>
                </div>
              </div>

              {/* Nav groups */}
              <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
                {MOBILE_NAV_SECTIONS.map((section, si) => (
                  <div key={section.label}>
                    <p className="px-1.5 pb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
                      {section.label}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.items.map(({ href, icon: Icon, title }, i) => {
                        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return (
                          <motion.div
                            key={href}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: si * 0.05 + i * 0.025, duration: 0.2, ease: "easeOut" }}
                          >
                            <Link
                              href={href}
                              onClick={() => setSheetOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-2xl border px-2.5 py-2.5 text-xs font-semibold transition-all active:scale-[0.97]",
                                active
                                  ? "border-primary/25 bg-primary/10 text-primary shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
                                  : "border-transparent bg-muted/40 text-muted-foreground hover:border-primary/15 hover:bg-primary/8 hover:text-primary dark:text-white/70 dark:hover:text-white",
                              )}
                            >
                              <span className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-xl",
                                active ? "bg-primary/15 dark:bg-amber-400/15" : "bg-background/70",
                              )}>
                                <Icon className="size-3.5" />
                              </span>
                              <span className="truncate">{title}</span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Quick controls */}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tuỳ chỉnh</span>
                <div className="flex items-center gap-1">
                  <LanguageToggle className="theme-control-surface" />
                  <NotificationBell />
                  <PushNotificationButton />
                  <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>
    </header>
  );
}
