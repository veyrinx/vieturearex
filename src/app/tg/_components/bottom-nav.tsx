"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, CalendarDays, Medal, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectionHaptic } from "../_lib/tg";

const NAV_ITEMS = [
  { href: "/tg", label: "Trang chủ", icon: Home, exact: true },
  { href: "/tg/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/tg/su-kien", label: "Sự kiện", icon: CalendarDays },
  { href: "/tg/leaderboard", label: "BXH", icon: Medal },
  { href: "/tg/profile", label: "Tôi", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{
        backgroundColor: "var(--tg-theme-secondary-bg-color, #1c1c1f)",
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
            onClick={selectionHaptic}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold"
          >
            <span
              className="flex h-8 w-14 items-center justify-center rounded-full transition-all"
              style={active ? { backgroundColor: "rgba(249,115,22,0.14)" } : undefined}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.6 : 1.8}
                style={{ color: active ? "var(--tg-theme-button-color, #f97316)" : "var(--tg-theme-hint-color, #8b8b8b)" }}
              />
            </span>
            <span
              style={{ color: active ? "var(--tg-theme-button-color, #f97316)" : "var(--tg-theme-hint-color, #8b8b8b)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
