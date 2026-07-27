import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { NameGenerator } from "@/components/tools/name-generator";

export const metadata: Metadata = {
  title: "Tạo tên kí tự đặc biệt Free Fire — Nickname phong cách",
  description:
    "Tạo tên Free Fire kí tự đặc biệt, chữ kiểu đẹp + khung trang trí (꧁༒꧂, súng, kiếm...). Nhập tên, bấm copy dán vào game.",
  alternates: { canonical: `${siteConfig.url}/name-generator` },
  openGraph: {
    title: "Tạo tên kí tự đặc biệt Free Fire — Nickname phong cách | Arex",
    description: "Tạo tên Free Fire kí tự đặc biệt, chữ kiểu đẹp + khung trang trí (꧁༒꧂, súng, kiếm...). Nhập tên, bấm copy dán vào game.",
    url: `${siteConfig.url}/name-generator`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default function TaoTenPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Tạo tên kí tự", href: "/name-generator" }]} />

      <PageHero
        icon={Sparkles}
        eyebrow="Nickname Free Fire"
        title="Tạo tên kí tự đặc biệt"
        subtitle="Nhập tên → ra hàng loạt kiểu chữ đẹp + khung trang trí, bấm copy vào game."
      />

      <NameGenerator />
    </main>
  );
}
