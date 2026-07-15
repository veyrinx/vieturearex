"use client";

import { useEffect, useState } from "react";
import { Mi } from "./mi";

type Status = "loading" | "subscribed" | "unsubscribed" | "unavailable";

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

async function fetchStatus(): Promise<boolean> {
  const initData = getInitData();
  if (!initData) return false;
  const res = await fetch("/api/telegram/miniapp/subscribe", {
    headers: { "x-telegram-init-data": initData },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { subscribed: boolean };
  return data.subscribed;
}

async function doSubscribe(): Promise<boolean> {
  const initData = getInitData();
  if (!initData) return false;
  const res = await fetch("/api/telegram/miniapp/subscribe", {
    method: "POST",
    headers: { "x-telegram-init-data": initData },
  });
  return res.ok;
}

async function doUnsubscribe(): Promise<boolean> {
  const initData = getInitData();
  if (!initData) return false;
  const res = await fetch("/api/telegram/miniapp/subscribe", {
    method: "DELETE",
    headers: { "x-telegram-init-data": initData },
  });
  return res.ok;
}

export function NotificationButton() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setStatus("unavailable");
      return;
    }
    fetchStatus()
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  async function handleToggle() {
    if (status === "subscribed") {
      setStatus("loading");
      await doUnsubscribe();
      setStatus("unsubscribed");
      return;
    }

    setStatus("loading");

    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.requestWriteAccess === "function") {
      tg.requestWriteAccess(async (granted: boolean) => {
        if (!granted) {
          setStatus("unsubscribed");
          return;
        }
        const ok = await doSubscribe();
        setStatus(ok ? "subscribed" : "unsubscribed");
      });
    } else {
      const ok = await doSubscribe();
      setStatus(ok ? "subscribed" : "unsubscribed");
    }
  }

  if (status === "unavailable") return null;

  const isSubscribed = status === "subscribed";
  const isLoading = status === "loading";

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className="w-full flex items-center justify-between p-4 rounded-2xl transition-opacity active:opacity-70 disabled:opacity-50"
      style={{
        backgroundColor: "var(--tg-theme-secondary-bg-color, #111)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isSubscribed ? "#10b98122" : "#6b728022",
          }}
        >
          {isLoading ? (
            <Mi name="progress_activity" size={20} className="animate-spin" color="var(--tg-theme-hint-color, #888)" />
          ) : isSubscribed ? (
            <Mi name="notifications_active" size={20} fill={1} color="#10b981" />
          ) : (
            <Mi name="notifications_off" size={20} color="var(--tg-theme-hint-color, #888)" />
          )}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">
            {isSubscribed ? "Thông báo đã bật" : "Bật thông báo"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--tg-theme-hint-color, #888)" }}>
            {isSubscribed
              ? "Nhận tin tức & sự kiện mới nhất"
              : "Nhận tin khi có bài viết hoặc sự kiện mới"}
          </p>
        </div>
      </div>
      <div
        className="w-12 h-6 rounded-full relative transition-colors shrink-0"
        style={{ backgroundColor: isSubscribed ? "#10b981" : "#6b7280" }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: isSubscribed ? "translateX(26px)" : "translateX(2px)" }}
        />
      </div>
    </button>
  );
}
