"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, CalendarDays, Trophy, Flame } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { NotificationButton } from "./_components/notification-button";

type TgUser = {
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

const QUICK_LINKS = [
  {
    href: "/tg/tin-tuc",
    icon: Newspaper,
    label: "Tin tức",
    desc: "Cập nhật mới nhất",
    color: "#3b82f6",
  },
  {
    href: "/tg/su-kien",
    icon: CalendarDays,
    label: "Sự kiện",
    desc: "Sự kiện in-game",
    color: "#10b981",
  },
  {
    href: "/tg/giai-dau",
    icon: Trophy,
    label: "Giải đấu",
    desc: "Bracket & kết quả",
    color: "#f59e0b",
  },
];

export default function TgHomePage() {
  const [user, setUser] = useState<TgUser | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      setUser(tg.initDataUnsafe.user);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
      >
        {user?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photo_url}
            alt="avatar"
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: "var(--tg-theme-button-color, #f97316)" }}
          >
            {user ? user.first_name[0].toUpperCase() : "A"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {user
              ? `Xin chào, ${user.first_name}${user.last_name ? " " + user.last_name : ""}!`
              : "Xin chào!"}
          </p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--tg-theme-hint-color, #888)" }}
          >
            Cộng đồng Free Fire – Arex
          </p>
        </div>
        <Flame size={28} className="shrink-0" style={{ color: "#f97316" }} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl p-3 flex flex-col items-center gap-2 text-center active:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}22` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-semibold">{label}</p>
              <p
                className="text-[10px]"
                style={{ color: "var(--tg-theme-hint-color, #888)" }}
              >
                {desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Notification opt-in */}
      <NotificationButton />

      {/* Open website */}
      <a
        href={siteConfig.url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl p-4 flex items-center justify-between active:opacity-70 transition-opacity"
        style={{ backgroundColor: "var(--tg-theme-button-color, #f97316)", color: "var(--tg-theme-button-text-color, #fff)" }}
      >
        <div>
          <p className="font-bold text-sm">Mở trang web đầy đủ</p>
          <p className="text-xs opacity-80">arexnetwork.site</p>
        </div>
        <span className="text-xl">→</span>
      </a>
    </div>
  );
}
