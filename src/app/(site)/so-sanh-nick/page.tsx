import type { Metadata } from "next";
import Link from "next/link";
import { Swords, Search } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { FfCompare } from "@/components/tools/ff-compare";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "So sánh 2 nick Free Fire | Arex",
  description:
    "Nhập 2 UID để so sánh trực tiếp: cấp độ, lượt thích, rank BR/CS, EXP, pet, điểm tín nhiệm — xem nick nào 'trâu' hơn.",
  alternates: { canonical: `${siteConfig.url}/so-sanh-nick` },
  openGraph: {
    title: "So sánh 2 nick Free Fire | Arex",
    description: "So kè 2 tài khoản Free Fire: level, likes, rank, pet… ai thắng?",
    url: `${siteConfig.url}/so-sanh-nick`,
    type: "website",
  },
};

export default function SoSanhNickPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "So sánh nick", href: "/so-sanh-nick" }]} />

      <PageHero
        icon={Swords}
        eyebrow="Nick nào trâu hơn?"
        title="So sánh 2 nick Free Fire"
        subtitle="Nhập 2 UID → so kè cấp độ, lượt thích, rank, EXP, pet, tín nhiệm và xem ai thắng."
      />

      <FfCompare />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/tra-cuu-nick"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Search className="size-4" /> Tra cứu 1 nick
        </Link>
        <ShareButton
          title="So sánh 2 nick Free Fire"
          text="Nick của bạn với bạn bè, ai trâu hơn? So kè ngay trên Arex!"
          className="px-4 py-2 text-xs"
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Dữ liệu công khai từ máy chủ Free Fire, chỉ để tham khảo cho vui.
      </p>
    </main>
  );
}
