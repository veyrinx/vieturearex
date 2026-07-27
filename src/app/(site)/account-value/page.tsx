import type { Metadata } from "next";
import Link from "next/link";
import { Gem, Trophy } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { NickValuatorSection } from "@/components/tools/nick-valuator-section";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "Ước tính độ khủng tài khoản Free Fire",
  description:
    "Tính điểm độ khủng tài khoản Free Fire từ rank, level, số skin, trang phục hiếm và vật phẩm giới hạn. Chỉ để tham khảo cho vui.",
  alternates: { canonical: `${siteConfig.url}/account-value` },
  openGraph: {
    title: "Ước tính độ khủng tài khoản Free Fire | Arex",
    description: "Tính điểm độ khủng tài khoản Free Fire từ rank, level, số skin, trang phục hiếm và vật phẩm giới hạn. Chỉ để tham khảo cho vui.",
    url: `${siteConfig.url}/account-value`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default function DinhGiaNickPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Ước tính nick", href: "/account-value" }]} />

      <PageHero
        icon={Gem}
        eyebrow="Nick của bạn khủng cỡ nào?"
        title="Ước tính độ khủng nick"
        subtitle="Nhập rank, level, skin, đồ hiếm → ra điểm độ khủng của tài khoản."
      />

      <NickValuatorSection />

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/top-players-vn#cong-dong" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Trophy className="size-4" /> Xem BXH nick khủng nhất
        </Link>
        <ShareButton title="Ước tính độ khủng nick Free Fire" text="Nick của bạn khủng cỡ nào? Tính thử trên Arex!" className="px-4 py-2 text-xs" />
      </div>
    </main>
  );
}
