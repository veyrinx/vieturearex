"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CRAFTLAND_ACADEMY, CRAFTLAND_BASE, CRAFTLAND_MAPS, CRAFTLAND_STUDIO } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: CRAFTLAND_BASE, label: "Tổng quan", exact: true },
  { href: CRAFTLAND_MAPS, label: "Thư viện bản đồ" },
  { href: CRAFTLAND_ACADEMY, label: "Academy" },
  { href: CRAFTLAND_STUDIO, label: "Creator Studio" },
];

export function CraftlandNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Craftland" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
