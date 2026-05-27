"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, User, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";

type TgUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };

export default function TgProfilePage() {
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [notInTg, setNotInTg] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user) setTgUser(user);

    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      const t = setTimeout(() => setNotInTg(true), 500);
      return () => clearTimeout(t);
    }

    fetch("/api/telegram/miniapp/subscribe", {
      headers: { "x-telegram-init-data": initData },
    })
      .then((r) => r.json())
      .then((d: { subscribed?: boolean; configured?: boolean }) => {
        setSubscribed(d.subscribed ?? false);
        setConfigured(d.configured ?? true);
      })
      .catch(() => { setSubscribed(false); setConfigured(false); });
  }, []);

  async function toggleSubscription() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || loading) return;
    setLoading(true);
    try {
      const method = subscribed ? "DELETE" : "POST";
      const res = await fetch("/api/telegram/miniapp/subscribe", {
        method,
        headers: { "x-telegram-init-data": initData, "Content-Type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
      });
      if (res.ok) {
        setSubscribed(!subscribed);
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        const msg =
          d.error === "not_configured"
            ? "Bot chưa được cấu hình — liên hệ admin"
            : d.error === "invalid"
            ? "Phiên Telegram không hợp lệ — thử mở lại"
            : "Thao tác thất bại — thử lại sau";
        window.Telegram?.WebApp?.showAlert?.(msg);
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
          <p className="font-bold text-lg">{tgUser?.first_name ?? (notInTg ? "Người dùng" : "…")}</p>
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

      {/* Not in Telegram warning */}
      {notInTg && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
        >
          <AlertCircle size={18} color="#ef4444" className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Chưa mở trong Telegram</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
              Tính năng profile và thông báo chỉ hoạt động khi mở qua Telegram Mini App.
            </p>
          </div>
        </div>
      )}

      {/* Bot not configured warning */}
      {!notInTg && configured === false && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
        >
          <AlertCircle size={18} color="#f59e0b" className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>Bot chưa được cấu hình</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
              Admin cần cấu hình Bot Token trong phần cài đặt để bật thông báo.
            </p>
          </div>
        </div>
      )}

      {/* Notification toggle */}
      {!notInTg && (
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
                  {subscribed === null
                    ? "Đang kiểm tra…"
                    : configured === false
                    ? "Chưa khả dụng"
                    : subscribed
                    ? "Đang bật"
                    : "Đang tắt"}
                </p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                  Nhận tin khi có bài viết/sự kiện mới
                </p>
              </div>
            </div>
            {subscribed !== null && configured !== false && (
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
      )}

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
