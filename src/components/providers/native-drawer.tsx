"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { callPlugin } from "@/lib/native/bridge";

interface NativeDrawerProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

const DRAWER_SECTIONS = [
  {
    label: "Chính",
    items: [
      { href: "/", label: "Trang Chủ", icon: { ios: "home", android: "home" } },
      { href: "/news", label: "Tin Tức", icon: { ios: "news", android: "news" } },
      { href: "/events", label: "Sự Kiện", icon: { ios: "events", android: "events" } },
    ],
  },
  {
    label: "Khám Phá",
    items: [
      { href: "/community", label: "Cộng Đồng", icon: { ios: "community", android: "community" } },
      { href: "/tools", label: "Công Cụ FF", icon: { ios: "tools", android: "tools" } },
      { href: "/quiz", label: "Quiz FF", icon: { ios: "quiz", android: "quiz" } },
      { href: "/wiki", label: "Wiki CĐ", icon: { ios: "wiki", android: "wiki" } },
      { href: "/items", label: "Thư Viện Icon", icon: { ios: "items", android: "items" } },
    ],
  },
  {
    label: "Giải Đấu & Esports",
    items: [
      { href: "/tournaments", label: "Giải Đấu", icon: { ios: "tournaments", android: "tournaments" } },
      { href: "/esports", label: "Trực Tiếp", icon: { ios: "live", android: "live" } },
      { href: "/top-players-vn", label: "BXH Nick VN", icon: { ios: "players", android: "players" } },
    ],
  },
  {
    label: "Tài Khoản & Cài Đặt",
    items: [
      { href: "/profile", label: "Hồ Sơ", icon: { ios: "profile", android: "profile" } },
      { href: "/prime-store", label: "Cửa Hàng Prime", icon: { ios: "prime", android: "prime" } },
      { href: "/settings", label: "Cài Đặt", icon: { ios: "settings", android: "settings" } },
    ],
  },
  {
    label: "Giới Thiệu",
    items: [
      { href: "/team", label: "Đội Ngũ", icon: { ios: "team", android: "team" } },
      { href: "/about", label: "Về Chúng Tôi", icon: { ios: "about", android: "about" } },
      { href: "/contact", label: "Liên Hệ", icon: { ios: "contact", android: "contact" } },
    ],
  },
] as const;

export function NativeDrawer({ open, onClose, pathname }: NativeDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-background shadow-[0_20px_70px_rgba(0,0,0,0.3)]"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
            role="dialog"
            aria-label="Menu điều hướng"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                  <PlatformIcon ios="home" android="home" size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-brand text-lg bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                    Arex Network
                  </p>
                  <p className="text-xs text-muted-foreground">Community Hub</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
                aria-label="Đóng menu"
              >
                <PlatformIcon ios="close" android="close" size={22} />
              </button>
            </div>

            {/* Navigation Sections */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {DRAWER_SECTIONS.map((section, si) => (
                <div key={section.label}>
                  <p className="px-1.5 pb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(({ href, icon, label }, i) => {
                      const active = 
                        href === "/" ? pathname === "/" : pathname.startsWith(href);
                      
                      return (
                        <motion.div
                          key={href}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.05 + i * 0.025, duration: 0.2, ease: "easeOut" }}
                        >
                          <Link
                            href={href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                              active
                                ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-300"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:text-white/80",
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            <span className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-xl",
                              active ? "bg-primary/15 dark:bg-amber-400/15" : "bg-muted/50",
                            )}>
                              <PlatformIcon
                                ios={icon.ios}
                                android={icon.android}
                                size={20}
                                className={cn(
                                  active ? "text-primary dark:text-amber-400" : "text-muted-foreground"
                                )}
                              />
                            </span>
                            <span className="truncate">{label}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quick Actions */}
              <div className="pt-4 border-t border-border/50 space-y-2">
                <button
                  onClick={() => { callPlugin("Haptics", "impact", { style: "LIGHT" }); onClose(); }}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-[0.98]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    <PlatformIcon ios="share" android="share" size={20} className="text-muted-foreground" />
                  </span>
                  <span>Chia sẻ ứng dụng</span>
                </button>
                <button
                  onClick={() => { callPlugin("Haptics", "impact", { style: "LIGHT" }); onClose(); }}
                  className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-[0.98]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                    <PlatformIcon ios="star" android="star" size={20} className="text-muted-foreground" />
                  </span>
                  <span>Đánh giá ứng dụng</span>
                </button>
              </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-border/50 p-4">
              <p className="text-center text-xs text-muted-foreground">
                Phiên bản 1.1.0 • Arex Network
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}