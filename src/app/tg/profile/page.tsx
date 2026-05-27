"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, User, CheckCircle, ExternalLink } from "lucide-react";

export default function TgProfilePage() {
  const [tgUser, setTgUser] = useState<{ id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user) setTgUser(user);

    // Check subscription status
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;
    fetch("/api/telegram/miniapp/subscribe", {
      headers: { "x-telegram-init-data": initData },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { subscribed?: boolean } | null) => { if (d) setSubscribed(d.subscribed ?? false); })
      .catch(() => {});
  }, []);

  async function toggleSubscription() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || loading) return;
    setLoading(true);
    try {
      if (subscribed) {
        const res = await fetch("/api/telegram/miniapp/subscribe", {
          method: "DELETE",
          headers: { "x-telegram-init-data": initData },
        });
        if (res.ok) setSubscribed(false);
      } else {
        const res = await fetch("/api/telegram/miniapp/subscribe", {
          method: "POST",
          headers: { "x-telegram-init-data": initData, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.ok) setSubscribed(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site";

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Avatar & name */}
      <div className="flex flex-col items-center gap-3 pt-4 pb-2">
        {tgUser?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tgUser.photo_url} alt="avatar" className="size-20 rounded-full" />
        ) : (
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--tg-theme-button-color,#f97316)" }}
          >
            <User size={36} color="white" />
          </div>
        )}
        <div className="text-center">
          <p className="font-bold text-lg">{tgUser?.first_name ?? "Người dùng"}</p>
          {tgUser?.username && (
            <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-sm">
              @{tgUser.username}
            </p>
          )}
          {tgUser?.id && (
            <p style={{ color: "var(--tg-theme-hint-color,#888)" }} className="text-xs mt-0.5">
              ID: {tgUser.id}
            </p>
          )}
        </div>
      </div>

      {/* Notification toggle */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
          Thông báo
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscribed
              ? <Bell size={20} style={{ color: "var(--tg-theme-button-color,#f97316)" }} />
              : <BellOff size={20} style={{ color: "var(--tg-theme-hint-color,#888)" }} />
            }
            <div>
              <p className="text-sm font-semibold">
                {subscribed === null ? "Đang kiểm tra…" : subscribed ? "Đang bật" : "Đang tắt"}
              </p>
              <p className="text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                Nhận tin khi có bài viết/sự kiện mới
              </p>
            </div>
          </div>
          {subscribed !== null && (
            <button
              type="button"
              onClick={toggleSubscription}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: subscribed
                  ? "rgba(239,68,68,0.15)"
                  : "var(--tg-theme-button-color,#f97316)",
                color: subscribed ? "#ef4444" : "var(--tg-theme-button-text-color,#fff)",
              }}
            >
              {loading ? "…" : subscribed ? "Tắt" : "Bật"}
            </button>
          )}
        </div>
        {subscribed && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <CheckCircle size={14} color="#10b981" />
            <p className="text-xs" style={{ color: "#10b981" }}>Bạn sẽ nhận DM khi có nội dung mới</p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
          Liên kết nhanh
        </p>
        {[
          { label: "Xem profile trên web", href: `${siteUrl}/profile` },
          { label: "Bảng xếp hạng giải đấu", href: `${siteUrl}/leaderboard` },
          { label: "Tất cả sự kiện", href: `${siteUrl}/su-kien` },
        ].map(({ label, href }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--tg-theme-bg-color,#000)" }}
          >
            <span className="text-sm">{label}</span>
            <ExternalLink size={14} style={{ color: "var(--tg-theme-hint-color,#888)" }} />
          </a>
        ))}
      </div>
    </div>
  );
}
