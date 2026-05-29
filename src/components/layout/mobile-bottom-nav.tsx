"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, CalendarDays, Trophy, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",            icon: Home,        label: "Trang chủ", exact: true },
  { href: "/news",        icon: Newspaper,   label: "Tin tức" },
  { href: "/events",      icon: CalendarDays,label: "Sự kiện" },
  { href: "/esports",     icon: Radio,       label: "Stream" },
  { href: "/tournaments", icon: Trophy,      label: "Giải đấu" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/tg")
  ) return null;

  return (
    <div
      className="fixed inset-x-3 z-50 md:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <nav className="flex items-stretch justify-around rounded-2xl border border-border/50 bg-card/96 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {NAV.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center py-3"
            >
              {/* Sliding active pill */}
              {active && (
                <motion.span
                  layoutId="mob-nav-pill"
                  className="absolute inset-x-1.5 inset-y-1.5 rounded-xl bg-primary/10 dark:bg-amber-400/10"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}

              <motion.span
                animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative z-10 flex flex-col items-center gap-1"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={cn(
                    "transition-colors duration-150",
                    active
                      ? "text-primary dark:text-amber-400"
                      : "text-muted-foreground/55",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-bold leading-none tracking-wide transition-colors duration-150",
                    active
                      ? "text-primary dark:text-amber-400"
                      : "text-muted-foreground/45",
                  )}
                >
                  {label}
                </span>
              </motion.span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
