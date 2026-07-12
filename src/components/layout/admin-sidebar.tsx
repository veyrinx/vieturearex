"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Search } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";
import { adminNavGroups } from "@/lib/constants/admin-nav";

const DEFAULT_SITE_NAME = siteConfig.shortName;
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function AdminSidebarContent({ onNavigate, logoUrl, siteIcon, siteName = DEFAULT_SITE_NAME }: { onNavigate?: () => void; logoUrl?: string; siteIcon?: string; siteName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex max-h-[calc(100vh-3rem)] flex-col rounded-none border border-border bg-card p-4 md:rounded-2xl">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Image
              src={logoUrl || siteIcon || siteConfig.sidebarIcon}
              alt={siteName}
              width={28}
              height={28}
              className="rounded-md border border-border"
            />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.14em] text-foreground">
              {siteName} QUẢN TRỊ
            </h2>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("admin-cmd-open"))}
        className="mb-3 flex w-full shrink-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Tìm nhanh...</span>
        <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[9px]">Ctrl K</kbd>
      </button>

      <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto">
        {adminNavGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.label} className="space-y-1">
              {/* Tiêu đề nhóm */}
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-0.5">
                <GroupIcon className="size-3 text-muted-foreground/50" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  {group.label}
                </span>
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition hover:border-primary/20 hover:bg-primary/10 hover:text-primary dark:hover:text-amber-300",
                      active &&
                        "border-primary/25 bg-primary/10 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-amber-300",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "" : "text-muted-foreground/70")} />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 border-t border-border pt-4">
        <AdminLogoutButton />
      </div>
    </aside>
  );
}

type AdminSidebarProps = {
  logoUrl?: string;
  siteIcon?: string;
  siteName?: string;
};

export function AdminSidebar({ logoUrl, siteIcon, siteName = DEFAULT_SITE_NAME }: AdminSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden w-72 shrink-0 self-start md:sticky md:top-6 md:block">
        <AdminSidebarContent logoUrl={logoUrl} siteIcon={siteIcon} siteName={siteName} />
      </div>

      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="MỞ SIDEBAR QUẢN TRỊ"
            className="theme-control-surface inline-flex size-10 items-center justify-center rounded-xl"
          >
            <PanelLeft className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-border bg-card p-2">
            <SheetHeader className="px-3 py-2">
              <SheetTitle className="text-left font-heading uppercase tracking-[0.08em] text-foreground">
                {siteName} QUẢN TRỊ
              </SheetTitle>
              <SheetDescription className="text-left text-muted-foreground">
                ĐIỀU HƯỚNG NHANH TỚI CÁC KHU VỰC QUẢN TRỊ.
              </SheetDescription>
            </SheetHeader>
            <AdminSidebarContent logoUrl={logoUrl} siteIcon={siteIcon} siteName={siteName} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
