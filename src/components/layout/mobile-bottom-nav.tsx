"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, CalendarDays, Trophy, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", icon: Home, label: "Trang chủ", exact: true },
  { href: "/news", icon: Newspaper, label: "Tin tức" },
  { href: "/events", icon: CalendarDays, label: "Sự kiện" },
  { href: "/esports", icon: Radio, label: "Stream" },
  { href: "/tournaments", icon: Trophy, label: "Giải đấu" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on admin/auth/tg routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/tg")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", backgroundColor: "hsl(var(--background)/0.95)" }}
    >
      <div className="flex">
        {NAV.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
