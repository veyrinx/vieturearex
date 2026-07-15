"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready(): void;
        expand(): void;
        enableClosingConfirmation(): void;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        requestWriteAccess?(callback: (granted: boolean) => void): void;
        showAlert?(message: string, callback?: () => void): void;
        showConfirm?(message: string, callback: (confirmed: boolean) => void): void;
        HapticFeedback?: {
          impactOccurred(style: string): void;
          notificationOccurred(type: string): void;
          selectionChanged(): void;
        };
        BackButton?: {
          show(): void;
          hide(): void;
          onClick(cb: () => void): void;
          offClick(cb: () => void): void;
        };
      };
    };
  }
}

export function TgInit() {
  const pathname = usePathname();
  const router = useRouter();

  // Khởi tạo 1 lần: mở rộng, đồng bộ màu header/nền theo theme Telegram.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor("secondary_bg_color");
      tg.setBackgroundColor("bg_color");
    } catch {
      /* API cũ: bỏ qua */
    }
  }, []);

  // Nút Back của Telegram: ẩn ở trang chủ, hiện + quay lại ở trang con.
  useEffect(() => {
    const bb = window.Telegram?.WebApp?.BackButton;
    if (!bb) return;
    const handler = () => router.back();
    if (pathname === "/tg") {
      bb.hide();
    } else {
      bb.show();
      bb.onClick(handler);
    }
    return () => bb.offClick?.(handler);
  }, [pathname, router]);

  return null;
}
