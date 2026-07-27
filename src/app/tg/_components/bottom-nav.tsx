"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mi } from "./mi";
import { selectionHaptic } from "../_lib/tg";

const NAV_ITEMS = [
  { href: "/tg", label: "Trang chủ", icon: "home", exact: true },
  { href: "/tg/news", label: "Tin tức", icon: "newspaper" },
  { href: "/tg/events", label: "Sự kiện", icon: "calendar_month" },
  { href: "/tg/leaderboard", label: "BXH", icon: "military_tech" },
  { href: "/tg/profile", label: "Tôi", icon: "person" },
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
      {NAV_ITEMS.map(({ href, label, icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const color = active ? "var(--tg-theme-button-color, #f97316)" : "var(--tg-theme-hint-color, #8b8b8b)";
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
              <Mi name={icon} size={22} fill={active ? 1 : 0} weight={active ? 600 : 400} color={color} />
            </span>
            <span style={{ color }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
