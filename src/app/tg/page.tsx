"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { NotificationButton } from "./_components/notification-button";
import { Mi } from "./_components/mi";
import { haptic } from "./_lib/tg";

type TgUser = {
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

const LINKS = [
  { href: "/tg/tin-tuc",    icon: "newspaper",             label: "Tin tức",   desc: "Mới nhất",   color: "#3b82f6" },
  { href: "/tg/su-kien",    icon: "calendar_month",        label: "Sự kiện",   desc: "In-game",    color: "#10b981" },
  { href: "/tg/giai-dau",   icon: "emoji_events",          label: "Giải đấu",  desc: "Bracket",    color: "#f59e0b" },
  { href: "/tg/leaderboard",icon: "military_tech",         label: "BXH",       desc: "Xếp hạng",   color: "#eab308" },
  { href: "/tg/stream",     icon: "live_tv",               label: "Stream",    desc: "Live & VOD", color: "#ef4444" },
  { href: "/tg/poll",       icon: "how_to_vote",           label: "Bình chọn", desc: "Poll",       color: "#8b5cf6" },
  { href: "/tg/quiz",       icon: "psychology",            label: "Quiz",      desc: "Đố vui",     color: "#ec4899" },
  { href: "/tg/profile",    icon: "person",                label: "Hồ sơ",     desc: "Của tôi",    color: "#06b6d4" },
];

export default function TgHomePage() {
  const [user, setUser] = useState<TgUser | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) setUser(tg.initDataUnsafe.user);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%)" }}
      >
        <Mi
          name="local_fire_department"
          size={150}
          fill={1}
          className="pointer-events-none absolute -right-6 -top-8 opacity-15"
          color="#fff"
        />
        <div className="relative flex items-center gap-3">
          {user?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photo_url}
              alt="avatar"
              className="h-14 w-14 rounded-full border-2 border-white/40 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-black text-white">
              {user ? user.first_name[0].toUpperCase() : "A"}
            </div>
          )}
          <div className="min-w-0 flex-1 text-white">
            <p className="truncate text-lg font-black leading-tight">
              {user ? `Chào ${user.first_name}!` : "Chào mừng!"}
            </p>
            <p className="truncate text-xs font-medium text-white/80">
              Cộng đồng Free Fire · Arex
            </p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3">
        {LINKS.map(({ href, icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            onClick={() => haptic("light")}
            className="flex items-center gap-3 rounded-2xl p-3 transition-transform active:scale-95"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #1c1c1f)" }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}22` }}
            >
              <Mi name={icon} size={24} fill={1} color={color} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{label}</p>
              <p className="truncate text-[11px]" style={{ color: "var(--tg-theme-hint-color, #8b8b8b)" }}>
                {desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Notification opt-in */}
      <NotificationButton />

      {/* Open full website */}
      <a
        href={siteConfig.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => haptic("medium")}
        className="flex items-center justify-between rounded-2xl p-4 transition-transform active:scale-[0.98]"
        style={{
          backgroundColor: "var(--tg-theme-button-color, #f97316)",
          color: "var(--tg-theme-button-text-color, #fff)",
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-black">Mở trang web đầy đủ</p>
          <p className="truncate text-xs opacity-80">arexnetwork.site</p>
        </div>
        <Mi name="chevron_right" size={24} />
      </a>
    </div>
  );
}
