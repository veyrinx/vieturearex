import type { Metadata } from "next";
import { Send } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { TelegramLinkClient } from "@/components/telegram/telegram-link-client";

export const metadata: Metadata = {
  title: "Liên kết Telegram",
  description: "Liên kết tài khoản Arex với Telegram Mini App để đồng bộ chuỗi điểm danh, điểm và hồ sơ.",
  alternates: { canonical: `${siteConfig.url}/telegram-link` },
  openGraph: {
    title: "Liên kết Telegram | Arex",
    description: "Liên kết tài khoản Arex với Telegram Mini App để đồng bộ chuỗi điểm danh, điểm và hồ sơ.",
    url: `${siteConfig.url}/telegram-link`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: false },
};

export default function TelegramLinkPage() {
  return (
    <main className="container-main my-8 max-w-lg space-y-8">
      <Breadcrumbs items={[{ name: "Liên kết Telegram", href: "/telegram-link" }]} />
      <PageHero
        icon={Send}
        eyebrow="Telegram Mini App"
        title="Liên kết tài khoản"
        subtitle="Tạo mã rồi nhập trong Mini App Telegram để đồng bộ chuỗi điểm danh, điểm & hồ sơ."
      />
      <TelegramLinkClient />
    </main>
  );
}
