import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { getSettings } from "@/lib/data/content-service";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { LinkCodeClient } from "@/components/common/link-code-client";

export const metadata: Metadata = {
  title: "Liên kết Zalo",
  description: "Liên kết tài khoản Arex với bot Zalo để điểm danh, xem điểm và hồ sơ ngay trong khung chat.",
  alternates: { canonical: `${siteConfig.url}/zalo-link` },
  openGraph: {
    title: "Liên kết Zalo | Arex",
    description: "Liên kết tài khoản Arex với bot Zalo để điểm danh, xem điểm và hồ sơ ngay trong khung chat.",
    url: `${siteConfig.url}/zalo-link`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: false },
};

export default async function ZaloLinkPage() {
  const settings = await getSettings().catch(() => []);
  const botLink =
    settings.find((s) => s.key === "integrations.zalo_bot_link")?.value?.trim() ||
    (process.env.ZALO_BOT_LINK?.trim() ?? "");

  return (
    <main className="container-main my-8 max-w-lg space-y-8">
      <Breadcrumbs items={[{ name: "Liên kết Zalo", href: "/zalo-link" }]} />
      <PageHero
        icon={MessageCircle}
        eyebrow="Bot Zalo"
        title="Liên kết tài khoản"
        subtitle="Tạo mã rồi gõ “lienket MÃ” cho bot Zalo để đồng bộ điểm, chuỗi điểm danh & hồ sơ."
      />

      {botLink && (
        <a
          href={botLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center rounded-xl bg-[#0068FF] text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          Mở bot Arex trên Zalo
        </a>
      )}

      <LinkCodeClient
        endpoint="/api/zalo/link/code"
        loginNext="/zalo-link"
        codeHint="gõ cho bot Zalo: lienket MÃ"
        steps={[
          "Bấm “Tạo mã liên kết” ở trên.",
          "Mở khung chat với bot Arex trên Zalo.",
          "Gõ: lienket MÃ (ví dụ: lienket A7K2QP) → xong!",
        ]}
        footNote="Liên kết xong, gõ “diemdanh” mỗi ngày để cộng điểm và “hoso” để xem điểm, chuỗi ngay trong chat."
      />
    </main>
  );
}
