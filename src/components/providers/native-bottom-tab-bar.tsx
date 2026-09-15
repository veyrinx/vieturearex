"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { callPlugin, isNativeApp } from "@/lib/native/bridge";

interface NativeBottomTabBarProps {
  pathname: string;
}

const TABS = [
  { href: "/", label: "Trang Chủ", icon: { ios: "home", android: "home" } },
  { href: "/news", label: "Tin Tức", icon: { ios: "news", android: "news" } },
  { href: "/events", label: "Sự Kiện", icon: { ios: "events", android: "events" } },
  { href: "/community", label: "Cộng Đồng", icon: { ios: "community", android: "community" } },
  { href: "/profile", label: "Cá Nhân", icon: { ios: "profile", android: "profile" } },
] as const;

export function NativeBottomTabBar({ pathname }: NativeBottomTabBarProps) {
  const [mounted, setMounted] = useState(false);

  const handleTabPress = useCallback(
    (href: string) => {
      if (href === pathname) {
        callPlugin("Haptics", "impact", { style: "LIGHT" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        callPlugin("Haptics", "impact", { style: "MEDIUM" });
      }
    },
    [pathname]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isNativeApp()) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 bottom-safe-nav"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      }}
      role="navigation"
      aria-label="Điều hướng chính"
    >
      <div className="relative mx-auto max-w-[500px]">
        <motion.div
          layoutId="tab-indicator"
          className="absolute top-1 left-1/2 -translate-x-1/2 w-[calc(100%/5_-_8px)] h-[calc(100%_-_2px)] rounded-2xl bg-primary/15 dark:bg-amber-400/15 transition-all duration-300 ease-out"
          style={{
            transformOrigin: "center center",
          }}
        />

        <div className="relative flex h-16 items-center justify-between px-2 gap-1 bg-background/95 backdrop-blur-xl border-t border-border/50 dark:border-border/30 rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
          {TABS.map((tab, index) => {
            const isActive =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => handleTabPress(tab.href)}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "text-primary dark:text-amber-400 z-10"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-white/80",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
              >
                <PlatformIcon
                  ios={tab.icon.ios}
                  android={tab.icon.android}
                  size={24}
                  className={cn(
                    "transition-all duration-200",
                    isActive ? "scale-110" : "scale-100",
                  )}
                />
                <span className={cn("truncate whitespace-nowrap", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}