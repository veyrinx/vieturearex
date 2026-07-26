import type { Metadata } from "next";
import { Skull } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { KdCalculator } from "@/components/tools/kd-calculator";

export const metadata: Metadata = {
  title: "Máy tính K/D & tỉ lệ thắng Free Fire",
  description:
    "Tính K/D, tỉ lệ thắng (booyah), hạ gục trung bình mỗi trận và tỉ lệ headshot Free Fire từ chỉ số của bạn.",
  alternates: { canonical: `${siteConfig.url}/tinh-kd` },
  openGraph: {
    title: "Máy tính K/D & tỉ lệ thắng Free Fire | Arex",
    description: "Tính K/D, tỉ lệ thắng (booyah), hạ gục trung bình mỗi trận và tỉ lệ headshot Free Fire từ chỉ số của bạn.",
    url: `${siteConfig.url}/tinh-kd`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default function TinhKdPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Máy tính K/D", href: "/tinh-kd" }]} />

      <PageHero
        icon={Skull}
        eyebrow="Thống kê Free Fire"
        title="Máy tính K/D & tỉ lệ thắng"
        subtitle="Nhập chỉ số → ra K/D, tỉ lệ thắng, hạ gục trung bình mỗi trận."
      />

      <KdCalculator />
    </main>
  );
}
