import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { TgInit } from "./_components/tg-init";
import { BottomNav } from "./_components/bottom-nav";

export const metadata: Metadata = {
  title: "Arex Mini App",
  description: "Cổng thông tin cộng đồng Free Fire – Arex",
};

export default function TelegramMiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <TgInit />
      <div
        className="flex flex-col min-h-screen"
        style={{
          backgroundColor: "var(--tg-theme-bg-color, #18181b)",
          color: "var(--tg-theme-text-color, #f4f4f5)",
        }}
      >
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
