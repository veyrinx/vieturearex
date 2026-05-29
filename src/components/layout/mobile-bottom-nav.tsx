"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, CalendarDays, Trophy, Radio } from "lucide-react";
import { motion } from "framer-motion";
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

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/tg")
  ) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      {/* iOS-style hairline separator */}
      <div className="h-px bg-black/[0.12] dark:bg-white/[0.1]" />

      {/* Frosted glass layer — mimics iOS UITabBar blur */}
      <div className="absolute inset-0 bg-background/82 backdrop-blur-2xl" />

      {/* Tab items */}
      <div
        className="relative flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-[3px] pt-2 pb-1.5"
            >
              <motion.span
                animate={{ scale: active ? 1 : 0.9, y: active ? -0.5 : 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
                className="flex flex-col items-center gap-[3px]"
              >
                {/* Icon wrapper — filled circle on active like iOS */}
                <span className="relative flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="ios-tab-bg"
                      className="absolute size-9 rounded-[10px] bg-primary/10 dark:bg-amber-400/10"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                  <Icon
                    size={23}
                    strokeWidth={active ? 2.4 : 1.65}
                    className={cn(
                      "relative z-10 transition-colors duration-100",
                      active
                        ? "text-primary dark:text-amber-400"
                        : "text-[#8E8E93] dark:text-[#98989D]",
                    )}
                  />
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-tight transition-colors duration-100",
                    active
                      ? "font-semibold text-primary dark:text-amber-400"
                      : "font-medium text-[#8E8E93] dark:text-[#98989D]",
                  )}
                >
                  {label}
                </span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
