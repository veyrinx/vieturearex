import type { Metadata } from "next";
import Link from "next/link";
import { Gem, Trophy } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { AccountValuator } from "@/components/tools/account-valuator";

export const metadata: Metadata = {
  title: "Ước tính độ khủng tài khoản Free Fire | Arex",
  description:
    "Tính điểm độ khủng tài khoản Free Fire từ rank, level, số skin, trang phục hiếm và vật phẩm giới hạn. Chỉ để tham khảo cho vui.",
  alternates: { canonical: `${siteConfig.url}/dinh-gia-nick` },
};

export default function DinhGiaNickPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Ước tính nick", href: "/dinh-gia-nick" }]} />

      <PageHero
        icon={Gem}
        eyebrow="Nick của bạn khủng cỡ nào?"
        title="Ước tính độ khủng nick"
        subtitle="Nhập rank, level, skin, đồ hiếm → ra điểm độ khủng của tài khoản."
      />

      <AccountValuator />

      <div className="flex justify-center">
        <Link href="/bxh-nick" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Trophy className="size-4" /> Xem BXH nick khủng nhất
        </Link>
      </div>
    </main>
  );
}
