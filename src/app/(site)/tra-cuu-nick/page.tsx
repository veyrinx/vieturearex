import type { Metadata } from "next";
import Link from "next/link";
import { Search, Gem, Trophy } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { FfPlayerLookup } from "@/components/tools/ff-player-lookup";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "Tra cứu thông tin nick Free Fire",
  description:
    "Nhập UID để tra cứu thông tin tài khoản Free Fire: tên, cấp độ, rank BR/CS, lượt thích, guild, pet, chữ ký... dữ liệu trực tiếp từ máy chủ.",
  alternates: { canonical: `${siteConfig.url}/tra-cuu-nick` },
  openGraph: {
    title: "Tra cứu thông tin nick Free Fire | Arex",
    description: "Nhập UID → xem tên, cấp độ, rank, guild, pet... của bất kỳ tài khoản Free Fire nào.",
    url: `${siteConfig.url}/tra-cuu-nick`,
    type: "website",
  },
};

export default function TraCuuNickPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Tra cứu nick", href: "/tra-cuu-nick" }]} />

      <PageHero
        icon={Search}
        eyebrow="Thông tin tài khoản Free Fire"
        title="Tra cứu thông tin nick"
        subtitle="Nhập UID → xem tên, cấp độ, rank, lượt thích, guild, pet, chữ ký… lấy trực tiếp từ máy chủ."
      />

      <FfPlayerLookup />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/bxh-nick-vn"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Trophy className="size-4" /> BXH nick khủng VN
        </Link>
        <Link
          href="/dinh-gia-nick"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Gem className="size-4" /> Ước tính độ khủng nick
        </Link>
        <ShareButton
          title="Tra cứu thông tin nick Free Fire"
          text="Tra cứu tên, cấp độ, rank, guild... của nick Free Fire bất kỳ trên Arex!"
          className="px-4 py-2 text-xs"
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Dữ liệu công khai từ máy chủ Free Fire, chỉ để tham khảo. Không lấy được túi đồ/skin (game không cho phép).
      </p>
    </main>
  );
}
