"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  House, BookOpenText, MessageSquare, MonitorPlay, User, LayoutDashboard,
  TrendingUp, Trophy, Users, Palette, X, Grid2x2,
  CalendarDays, Flame, BookOpen, Rss, Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ── Section: Khám phá ──────────────────────────────────────────────────────
const EXPLORE_ITEMS = [
  { title: "Lịch",          href: "/calendar",             icon: CalendarDays, color: "sky"     },
  { title: "Sự Kiện",       href: "/events",               icon: Flame,        color: "orange"  },
  { title: "Đội Ngũ",       href: "/team",                 icon: Users,        color: "blue"    },
];

// ── Section: Cộng đồng ─────────────────────────────────────────────────────
const COMMUNITY_ITEMS = [
  { title: "Diễn Đàn",       href: "/cong-dong",             icon: MessageSquare, color: "blue"    },
  { title: "Feed",            href: "/feed",                  icon: Rss,           color: "orange"  },
  { title: "Wiki",            href: "/wiki",                  icon: BookOpen,      color: "emerald" },
  { title: "Icon FF",         href: "/items",                 icon: ImageIcon,     color: "yellow"  },
  { title: "Xu Hướng",       href: "/cong-dong/xu-huong",    icon: TrendingUp,    color: "orange"  },
  { title: "Bình Chọn",      href: "/binh-chon",             icon: Trophy,        color: "yellow"  },
  { title: "Tuyển TV",       href: "/tuyen-thanh-vien",      icon: Users,         color: "violet"  },
  { title: "Trang Cá Nhân",  href: "/cong-dong/cosmetics",   icon: Palette,       color: "pink"    },
];

type ColorKey = "sky" | "orange" | "blue" | "red" | "emerald" | "yellow" | "violet" | "pink";
const COLOR: Record<ColorKey, { icon: string; bg: string; ring: string }> = {
  sky:     { icon: "text-sky-500 dark:text-sky-400",       bg: "bg-sky-500/12 dark:bg-sky-400/12",         ring: "ring-sky-400/30"     },
  orange:  { icon: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/12 dark:bg-orange-400/12",   ring: "ring-orange-400/30"  },
  blue:    { icon: "text-blue-500 dark:text-blue-400",     bg: "bg-blue-500/12 dark:bg-blue-400/12",       ring: "ring-blue-400/30"    },
  red:     { icon: "text-red-500 dark:text-red-400",       bg: "bg-red-500/12 dark:bg-red-400/12",         ring: "ring-red-400/30"     },
  emerald: { icon: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/12 dark:bg-emerald-400/12", ring: "ring-emerald-400/30" },
  yellow:  { icon: "text-amber-500 dark:text-amber-400",   bg: "bg-amber-500/12 dark:bg-amber-400/12",     ring: "ring-amber-400/30"   },
  violet:  { icon: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/12 dark:bg-violet-400/12",   ring: "ring-violet-400/30"  },
  pink:    { icon: "text-pink-500 dark:text-pink-400",     bg: "bg-pink-500/12 dark:bg-pink-400/12",       ring: "ring-pink-400/30"    },
};

function MenuGridItem({
  title, href, icon: Icon, color, pathname, delay, onClose,
}: { title: string; href: string; icon: React.ElementType; color: ColorKey; pathname: string; delay: number; onClose: () => void }) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  const c = COLOR[color];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 480, damping: 30 }}
    >
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-2xl p-2.5 transition-all active:scale-95",
          active ? cn(c.bg, "ring-1 ring-inset", c.ring) : "bg-muted/50 hover:bg-muted",
        )}
      >
        <span className={cn("flex size-10 items-center justify-center rounded-xl", active ? c.bg : "bg-background/80")}>
          <Icon className={cn("size-5", active ? c.icon : "text-muted-foreground")} />
        </span>
        <span className={cn("text-center text-[9.5px] font-bold leading-tight", active ? c.icon : "text-foreground")}>
          {title}
        </span>
      </Link>
    </motion.div>
  );
}

// ── Bottom nav item type ───────────────────────────────────────────────────
type NavItem = { href?: string; icon: React.ElementType; label: string; exact?: boolean; action?: "menu" };

const BASE_NAV: NavItem[] = [
  { href: "/",        icon: House,        label: "Trang chủ", exact: true },
  { href: "/news",    icon: BookOpenText, label: "Tin tức"   },
  {                   icon: Grid2x2,      label: "Khám phá",  action: "menu" },
  { href: "/esports", icon: MonitorPlay,  label: "Esports"   },
  { href: "/profile", icon: User,         label: "Hồ sơ"    },
];
const ADMIN_ITEM: NavItem = { href: "/admin", icon: LayoutDashboard, label: "Admin" };
const ADMIN_ROLES = ["super_admin", "admin", "manager", "support"];

// ── Component ─────────────────────────────────────────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users").select("role").eq("id", data.user.id).maybeSingle<{ role: string }>();
      if (profile?.role && ADMIN_ROLES.includes(profile.role)) setIsAdmin(true);
    });
  }, []);

  useEffect(() => {
    let prev = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      if (cur < 48) setCollapsed(false);
      else if (cur > prev + 4) setCollapsed(true);
      else if (prev > cur + 4) setCollapsed(false);
      prev = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/tg")) return null;

  const allMenuHrefs = [...EXPLORE_ITEMS, ...COMMUNITY_ITEMS].map((i) => i.href);
  const isMenuActive = allMenuHrefs.some((h) => pathname === h || (h !== "/" && pathname.startsWith(h)));
  const nav = isAdmin ? [...BASE_NAV, ADMIN_ITEM] : BASE_NAV;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px] md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Full menu sheet */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 md:hidden"
            style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-3 overflow-hidden rounded-3xl border border-border/50 bg-card/98 shadow-[0_-12px_64px_rgba(0,0,0,0.22)] backdrop-blur-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">Điều Hướng</p>
                  <p className="text-sm font-bold text-foreground leading-tight">Tất cả trang</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setMenuOpen(false)}
                  className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
                >
                  <X className="size-3.5" />
                </motion.button>
              </div>

              <div className="space-y-0 divide-y divide-border/40">
                {/* Section: Khám phá */}
                <div className="px-3 pb-3 pt-2.5">
                  <p className="px-1 pb-2 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
                    Khám Phá
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPLORE_ITEMS.map(({ title, href, icon, color }, i) => (
                      <MenuGridItem
                        key={href}
                        title={title}
                        href={href}
                        icon={icon}
                        color={color as ColorKey}
                        pathname={pathname}
                        delay={i * 0.03}
                        onClose={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>

                {/* Section: Cộng đồng */}
                <div className="px-3 pb-4 pt-2.5">
                  <p className="px-1 pb-2 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
                    Cộng Đồng
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {COMMUNITY_ITEMS.map(({ title, href, icon, color }, i) => (
                      <MenuGridItem
                        key={href}
                        title={title}
                        href={href}
                        icon={icon}
                        color={color as ColorKey}
                        pathname={pathname}
                        delay={(EXPLORE_ITEMS.length + i) * 0.028}
                        onClose={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div
        className="fixed inset-x-3 z-50 md:hidden"
        style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <motion.nav
          animate={{ borderRadius: collapsed ? 22 : 26 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="relative overflow-hidden border border-white/40 dark:border-white/[0.08] bg-white/35 dark:bg-zinc-900/80 backdrop-blur-[48px] backdrop-saturate-[200%]"
          style={{
            boxShadow: [
              "0 8px 40px rgba(0,0,0,0.12)",
              "0 2px 8px rgba(0,0,0,0.06)",
              "0 0 0 0.5px rgba(0,0,0,0.04)",
              "inset 0 1.5px 0 rgba(255,255,255,0.80)",
              "inset 0 -0.5px 0 rgba(255,255,255,0.14)",
            ].join(", "),
          }}
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />

          <div className="flex items-center px-1.5">
            {nav.map(({ href, icon: Icon, label, exact, action }) => {
              const active = action === "menu"
                ? isMenuActive || menuOpen
                : exact ? pathname === href : pathname.startsWith(href!);

              const inner = (
                <>
                  {active && (
                    <motion.span
                      layoutId="ios26-pill"
                      className="absolute inset-x-1 -inset-y-0.5 rounded-[17px] border border-white/55 dark:border-white/12 bg-white/65 dark:bg-white/[0.11]"
                      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 4px rgba(0,0,0,0.08)" }}
                      transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}

                  <motion.span
                    animate={{ scale: active ? 1.08 : 1, y: active ? -0.5 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="relative z-10 flex flex-col items-center gap-[3px]"
                  >
                    <Icon
                      size={21}
                      strokeWidth={active ? 2.4 : 1.65}
                      className={cn(
                        "transition-colors duration-100",
                        active ? "text-primary dark:text-amber-400" : "text-black/36 dark:text-white/36",
                      )}
                    />

                    {active && (
                      <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary dark:bg-amber-400 shadow-[0_0_6px_2px_hsl(var(--primary)/0.55)] dark:shadow-[0_0_6px_2px_rgba(251,191,36,0.55)]" />
                    )}

                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16, ease: "easeInOut" }}
                          className={cn(
                            "overflow-hidden text-[9px] leading-none tracking-tight font-semibold",
                            active ? "text-primary dark:text-amber-400" : "text-black/36 dark:text-white/36",
                          )}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                </>
              );

              if (action === "menu") {
                return (
                  <button
                    key={label}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="relative flex flex-1 flex-col items-center py-2.5"
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <Link key={label} href={href!} className="relative flex flex-1 flex-col items-center py-2.5">
                  {inner}
                </Link>
              );
            })}
          </div>
        </motion.nav>
      </div>
    </>
  );
}
