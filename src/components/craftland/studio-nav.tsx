"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, BarChart3, LayoutDashboard, Map as MapIcon, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/creator", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/creator/maps", label: "Bản đồ", icon: MapIcon },
  { href: "/creator/analytics", label: "Phân tích", icon: BarChart3 },
  { href: "/creator/profile", label: "Hồ sơ", icon: UserRound },
  { href: "/creator/verification", label: "Xác minh", icon: BadgeCheck },
];

export function StudioNav({ hasProfile }: { hasProfile: boolean }) {
  const pathname = usePathname();
  const items = hasProfile ? ITEMS : ITEMS.filter((i) => i.href === "/creator/profile" || i.exact);
  return (
    <nav aria-label="Creator Studio" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
