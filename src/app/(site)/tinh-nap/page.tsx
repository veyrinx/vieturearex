import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { TopupCalculator } from "@/components/tools/topup-calculator";

export const metadata: Metadata = {
  title: "Máy tính nạp & chi phí Free Fire — Kim cương / vòng quay | Arex",
  description:
    "Tính số kim cương và tiền cần để mua vật phẩm hoặc quay vòng quay Free Fire. Minh bạch chi phí, chơi có trách nhiệm.",
  alternates: { canonical: `${siteConfig.url}/tinh-nap` },
};

export default function TinhNapPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Máy tính nạp", href: "/tinh-nap" }]} />

      <PageHero
        icon={Wallet}
        eyebrow="Minh bạch chi phí"
        title="Máy tính nạp & vòng quay"
        subtitle="Tính kim cương + tiền cần cho vật phẩm/vòng quay — để chi tiêu hợp lý."
      />

      <TopupCalculator />
    </main>
  );
}
