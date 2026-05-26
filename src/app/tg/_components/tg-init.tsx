"use client";

import { useEffect } from "react";

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
      };
    };
  }
}

export function TgInit() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
  }, []);

  return null;
}
