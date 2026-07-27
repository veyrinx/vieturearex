import type { Metadata } from "next";
import Link from "next/link";
import { Users, Search, Trophy } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { FfGuildLookup } from "@/components/tools/ff-guild-lookup";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "Tra cứu Guild Free Fire chi tiết",
  description:
    "Nhập UID thành viên để xem chi tiết guild Free Fire: tên guild, cấp độ, sĩ số, sức chứa và tài khoản chủ. Dữ liệu trực tiếp từ máy chủ.",
  alternates: { canonical: `${siteConfig.url}/guild-lookup` },
  openGraph: {
    title: "Tra cứu Guild Free Fire chi tiết | Arex",
    description: "Nhập UID → xem tên guild, cấp độ, sĩ số & sức chứa của bất kỳ guild Free Fire nào.",
    url: `${siteConfig.url}/guild-lookup`,
    type: "website",
  },
};

export default function TraCuuGuildPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Tra cứu Guild", href: "/guild-lookup" }]} />

      <PageHero
        icon={Users}
        eyebrow="Thông tin guild Free Fire"
        title="Tra cứu Guild chi tiết"
        subtitle="Nhập UID của một thành viên → xem tên guild, cấp độ, sĩ số, sức chứa… lấy trực tiếp từ máy chủ."
      />

      <FfGuildLookup />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/player-lookup"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Search className="size-4" /> Tra cứu nick
        </Link>
        <Link
          href="/top-players-vn"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Trophy className="size-4" /> BXH nick khủng VN
        </Link>
        <ShareButton
          title="Tra cứu Guild Free Fire chi tiết"
          text="Tra cứu tên guild, cấp độ, sĩ số… của guild Free Fire bất kỳ trên Arex!"
          className="px-4 py-2 text-xs"
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Dữ liệu công khai từ máy chủ Free Fire, chỉ để tham khảo. Thông tin guild lấy theo tài khoản thành viên bạn nhập.
      </p>
    </main>
  );
}
