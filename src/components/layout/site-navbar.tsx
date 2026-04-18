"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { PushNotificationButton } from "@/components/common/push-notification-button";
import { UserNavButton } from "@/components/common/user-nav-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navItems, siteConfig } from "@/lib/constants/site";

const ICON_LIGHT_DEFAULT = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035";
const ICON_DARK_DEFAULT = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441";

type SiteNavbarProps = {
  logoLight?: string;
  logoDark?: string;
};

export function SiteNavbar({ logoLight, logoDark }: SiteNavbarProps) {
  const iconLight = logoLight || ICON_LIGHT_DEFAULT;
  const iconDark = logoDark || ICON_DARK_DEFAULT;
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isHomePage = pathname === "/";

  const homeControlClass =
    "theme-control-surface border-slate-200/90 bg-white/84 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-[#0F1115]/72 dark:text-white dark:hover:bg-[#151820]";

  return (
    <header
      className={cn(
        "z-50 backdrop-blur-xl",
        isHomePage
          ? "fixed inset-x-0 top-0 border-b-0 bg-white/72 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:bg-slate-950/42 dark:shadow-none"
          : "sticky top-0 border-b border-border bg-background/85",
      )}
    >
      {/* ── Tầng 1: Brand + Controls ── */}
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo + Tên site */}
        <Link href="/" aria-label={siteConfig.shortName} className="inline-flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Image
              src={iconLight}
              alt={siteConfig.shortName}
              width={36}
              height={36}
              priority
              className="block aspect-square object-cover drop-shadow-[0_8px_22px_rgba(15,23,42,0.18)] dark:hidden"
            />
            <Image
              src={iconDark}
              alt={siteConfig.shortName}
              width={36}
              height={36}
              priority
              className="hidden aspect-square object-cover drop-shadow-[0_8px_22px_rgba(0,0,0,0.38)] dark:block"
            />
          </motion.div>
          <div className="hidden flex-col sm:flex" style={{ lineHeight: 1.1 }}>
            <span className="font-heading text-[0.7rem] font-black uppercase tracking-[0.14em] text-foreground">
              {siteConfig.shortName}
            </span>
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Community Hub
            </span>
          </div>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/search"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-xl transition-colors",
              isHomePage ? homeControlClass : "theme-control-surface",
            )}
            aria-label="Tìm kiếm"
          >
            <Search className="size-4" />
          </Link>
          <UserNavButton className={isHomePage ? homeControlClass : undefined} />
          <PushNotificationButton className={isHomePage ? homeControlClass : undefined} />
          <ThemeToggle className={isHomePage ? homeControlClass : undefined} />

          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-xl md:hidden",
                isHomePage ? homeControlClass : "theme-control-surface",
              )}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="border-border bg-card text-foreground">
              <SheetHeader>
                <SheetTitle className="font-heading uppercase tracking-[0.08em] text-foreground">
                  {siteConfig.name}
                </SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Điều hướng nhanh tới các khu vực cộng đồng.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-8 space-y-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        "block rounded-xl border border-transparent px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:border-primary/20 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:text-amber-300",
                        pathname === item.href &&
                          "border-primary/25 bg-primary/10 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-amber-300",
                      )}
                    >
                      {item.title}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Tầng 2: Navigation links (desktop only) ── */}
      <div
        className={cn(
          "hidden md:block border-t",
          isHomePage
            ? "border-slate-200/35 dark:border-white/8"
            : "border-border/70",
        )}
      >
        <nav className="mx-auto flex h-10 w-full max-w-7xl items-center justify-center gap-0.5 px-4 md:px-6">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative px-4 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] transition-all rounded-lg",
                    isHomePage
                      ? "text-slate-600 hover:text-slate-950 hover:bg-black/5 dark:text-white/75 dark:hover:text-white dark:hover:bg-white/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:text-white/70 dark:hover:text-white",
                    active &&
                      "text-primary dark:text-amber-300 bg-primary/8 dark:bg-amber-400/8 hover:bg-primary/12 dark:hover:bg-amber-400/12",
                  )}
                >
                  {item.title}
                  {active && (
                    <motion.span
                      layoutId="nav-active-2"
                      className="absolute -bottom-[1px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] dark:from-amber-400 dark:to-orange-500"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
