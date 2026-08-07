import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { DiscordLinkClient } from "@/components/discord/discord-link-client";

export const metadata: Metadata = {
  title: "Liên kết Discord",
  description:
    "Nối tài khoản Arex với Discord để nhận thông báo đơn hàng, tra đơn bằng lệnh và được gán role đúng vai trò.",
  alternates: { canonical: `${siteConfig.url}/discord-link` },
  robots: { index: false },
};

export default function DiscordLinkPage() {
  return (
    <main className="container-main my-8 max-w-lg space-y-6">
      <Breadcrumbs items={[{ name: "Liên kết Discord", href: "/discord-link" }]} />
      <PageHero
        icon={MessageSquare}
        eyebrow="Bot Discord"
        title="Liên kết tài khoản"
        subtitle="Tạo mã rồi gõ /lienket trong server Discord của Arex."
      />
      <DiscordLinkClient />
    </main>
  );
}
