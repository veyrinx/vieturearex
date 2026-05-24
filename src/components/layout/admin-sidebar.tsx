"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";
import { adminNavItems, siteConfig } from "@/lib/constants/site";

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
    <aside className="glass-card flex max-h-[calc(100vh-3rem)] flex-col rounded-none p-4 md:rounded-2xl">
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
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-foreground">
              {siteName} QUẢN TRỊ
            </h2>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1.5 overflow-y-auto">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block rounded-xl border border-transparent px-3 py-2 text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground transition hover:border-primary/20 hover:bg-primary/10 hover:text-primary dark:hover:text-amber-300",
              pathname === item.href &&
              "border-primary/25 bg-primary/10 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-amber-300",
            )}
          >
            {item.title}
          </Link>
        ))}
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
