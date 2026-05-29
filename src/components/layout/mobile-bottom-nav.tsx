"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Newspaper, CalendarDays, Trophy, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",            icon: Home,         label: "Trang chủ", exact: true },
  { href: "/news",        icon: Newspaper,    label: "Tin tức" },
  { href: "/events",      icon: CalendarDays, label: "Sự kiện" },
  { href: "/esports",     icon: Radio,        label: "Stream" },
  { href: "/tournaments", icon: Trophy,       label: "Giải đấu" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  /* Collapse labels when scrolling down, expand when scrolling up / near top */
  useEffect(() => {
    let prev = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      if (cur < 48) { setCollapsed(false); }
      else if (cur > prev + 4) { setCollapsed(true); }
      else if (prev > cur + 4) { setCollapsed(false); }
      prev = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/tg")
  ) return null;

  return (
    <div
      className="fixed inset-x-4 z-50 md:hidden"
      style={{ bottom: "calc(14px + env(safe-area-inset-bottom))" }}
    >
      {/* ── Liquid Glass shell ── */}
      <motion.nav
        animate={{ borderRadius: collapsed ? 24 : 28 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="relative overflow-hidden
          border border-white/40 dark:border-white/[0.07]
          bg-white/30 dark:bg-zinc-900/75
          backdrop-blur-[44px] backdrop-saturate-[180%]"
        style={{
          boxShadow: [
            /* outer drop */
            "0 8px 32px rgba(0,0,0,0.10)",
            "0 2px 8px rgba(0,0,0,0.07)",
            /* crisp edge ring */
            "0 0 0 0.5px rgba(0,0,0,0.05)",
            /* inner top specular */
            "inset 0 1.5px 0 rgba(255,255,255,0.75)",
            /* inner bottom rim */
            "inset 0 -0.5px 0 rgba(255,255,255,0.18)",
          ].join(", "),
        }}
      >
        {/* Top specular streak */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

        <div className="flex items-center px-2">
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-1 flex-col items-center py-2"
              >
                {/* Sliding inner glass pill for active tab */}
                {active && (
                  <motion.span
                    layoutId="ios26-pill"
                    className="absolute inset-x-1 -inset-y-0.5 rounded-[18px]
                      border border-white/60 dark:border-white/10
                      bg-white/60 dark:bg-white/[0.10]"
                    style={{
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 3px rgba(0,0,0,0.07)",
                    }}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  />
                )}

                <motion.span
                  animate={{ scale: active ? 1.05 : 1, y: active ? -0.5 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative z-10 flex flex-col items-center gap-[3px]"
                >
                  <Icon
                    size={23}
                    strokeWidth={active ? 2.35 : 1.7}
                    className={cn(
                      "transition-colors duration-100",
                      active
                        ? "text-primary dark:text-amber-400"
                        : "text-black/38 dark:text-white/38",
                    )}
                  />

                  {/* Label — fades out when collapsed (scroll-down) */}
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className={cn(
                          "overflow-hidden text-[9.5px] leading-none tracking-tight",
                          active
                            ? "font-semibold text-primary dark:text-amber-400"
                            : "font-medium text-black/38 dark:text-white/38",
                        )}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
