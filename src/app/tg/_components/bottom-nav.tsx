"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, CalendarDays, BarChart2, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/tg", label: "Trang chủ", icon: Home, exact: true },
  { href: "/tg/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/tg/su-kien", label: "Sự kiện", icon: CalendarDays },
  { href: "/tg/poll", label: "Poll", icon: BarChart2 },
  { href: "/tg/stream", label: "Stream", icon: Radio },
  { href: "/tg/profile", label: "Tôi", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t flex"
      style={{
        backgroundColor: "var(--tg-theme-secondary-bg-color, #111)",
        borderColor: "rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-[var(--tg-theme-button-color,#f97316)]"
                : "text-[var(--tg-theme-hint-color,#888)]",
            )}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
