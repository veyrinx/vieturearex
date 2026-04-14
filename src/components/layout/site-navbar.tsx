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

const ICON_LIGHT = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035";
const ICON_DARK = "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441";

export function SiteNavbar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isHomePage = pathname === "/";
  const navLinkClass = isHomePage
    ? "relative py-2 text-sm font-semibold uppercase tracking-[0.02em] text-slate-700 transition hover:text-slate-950 dark:text-white dark:hover:text-white/80"
    : "relative py-2 text-sm font-semibold uppercase tracking-[0.02em] text-muted-foreground transition hover:text-foreground dark:text-white dark:hover:text-white/80";
  const activeNavClass = isHomePage ? "text-primary dark:text-amber-300" : "text-primary dark:text-amber-300";
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
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label={siteConfig.shortName} className="inline-flex items-center">
          {/* Light mode logo */}
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Image
              src={ICON_LIGHT}
              alt={siteConfig.shortName}
              width={40}
              height={40}
              priority
              className="block aspect-square object-cover drop-shadow-[0_8px_22px_rgba(15,23,42,0.18)] dark:hidden"
            />
            <Image
              src={ICON_DARK}
              alt={siteConfig.shortName}
              width={40}
              height={40}
              priority
              className="hidden aspect-square object-cover drop-shadow-[0_8px_22px_rgba(0,0,0,0.38)] dark:block"
            />
          </motion.div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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
                  className={cn(navLinkClass, active && activeNavClass)}
                >
                  {item.title}
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -bottom-[1px] left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-[#0052FF] to-[#4D7CFF] dark:from-amber-400 dark:to-orange-500"
                    />
                  ) : null}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-xl transition-colors",
              isHomePage ? homeControlClass : "theme-control-surface",
            )}
            aria-label="Tìm kiếm"
          >
            <Search className="size-4" />
          </Link>
          <UserNavButton className={isHomePage ? homeControlClass : undefined} />
          <PushNotificationButton className={isHomePage ? homeControlClass : undefined} />
          <ThemeToggle className={isHomePage ? homeControlClass : undefined} />
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-xl md:hidden",
                isHomePage
                  ? homeControlClass
                  : "theme-control-surface",
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
    </header>
  );
}
