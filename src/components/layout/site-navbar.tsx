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

const ICON_LIGHT_DEFAULT =
  "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035";
const ICON_DARK_DEFAULT =
  "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441";

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

  const ctrlClass =
    "theme-control-surface border-slate-200/90 bg-white/84 text-slate-900 hover:bg-white dark:border-white/15 dark:bg-[#0F1115]/72 dark:text-white dark:hover:bg-[#151820]";

  return (
    <header
      className={cn(
        "z-50 backdrop-blur-xl",
        isHomePage
          ? "fixed inset-x-0 top-0 bg-white/72 shadow-[0_8px_24px_rgba(15,23,42,0.07)] dark:bg-slate-950/42 dark:shadow-none"
          : "sticky top-0 border-b border-border bg-background/90",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-6">

        {/* ── Logo ── */}
        <Link
          href="/"
          aria-label={siteConfig.shortName}
          className="flex shrink-0 items-center gap-2.5"
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <Image
              src={iconLight}
              alt={siteConfig.shortName}
              width={36}
              height={36}
              priority
              className="block size-9 object-contain drop-shadow-[0_6px_18px_rgba(15,23,42,0.18)] dark:hidden"
            />
            <Image
              src={iconDark}
              alt={siteConfig.shortName}
              width={36}
              height={36}
              priority
              className="hidden size-9 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.38)] dark:block"
            />
          </motion.div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-heading text-[0.72rem] font-black uppercase tracking-[0.14em] text-foreground">
              {siteConfig.shortName}
            </span>
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Community Hub
            </span>
          </div>
        </Link>

        {/* ── Nav links (desktop center) ── */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
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
          <PushNotificationButton className={isHomePage ? ctrlClass : undefined} />
          <ThemeToggle className={isHomePage ? ctrlClass : undefined} />

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

            <SheetContent side="right" className="w-72 border-border bg-card text-foreground">
              <SheetHeader className="pb-2">
                <SheetTitle className="font-heading text-sm uppercase tracking-[0.1em] text-foreground">
                  {siteConfig.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Điều hướng nhanh tới các khu vực cộng đồng.
                </SheetDescription>
              </SheetHeader>

              {/* Logo in sheet */}
              <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
                <Image
                  src={iconLight}
                  alt={siteConfig.shortName}
                  width={40}
                  height={40}
                  className="block size-10 rounded-xl object-contain dark:hidden"
                />
                <Image
                  src={iconDark}
                  alt={siteConfig.shortName}
                  width={40}
                  height={40}
                  className="hidden size-10 rounded-xl object-contain dark:block"
                />
                <div className="leading-none">
                  <p className="font-heading text-sm font-black uppercase tracking-[0.12em] text-foreground">
                    {siteConfig.shortName}
                  </p>
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Community Hub
                  </p>
                </div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item, i) => {
                  const active = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25, ease: "easeOut" }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          "flex items-center rounded-xl border px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-all",
                          active
                            ? "border-primary/25 bg-primary/10 text-primary dark:border-amber-400/20 dark:bg-amber-400/8 dark:text-amber-300"
                            : "border-transparent text-muted-foreground hover:border-primary/15 hover:bg-primary/8 hover:text-primary dark:text-white/70 dark:hover:text-white",
                        )}
                      >
                        {item.title}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
