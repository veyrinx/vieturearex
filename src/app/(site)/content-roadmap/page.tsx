import type { Metadata } from "next";
import { Map } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { FF_ROADMAP } from "@/lib/data/ff-roadmap";
import { RoadmapList } from "@/components/tools/roadmap-list";

export const metadata: Metadata = {
  title: "Lịch nội dung Free Fire sắp ra — Roadmap",
  description:
    "Lịch nội dung Free Fire sắp ra mắt: nhân vật mới, skin, chế độ chơi, sự kiện và bản cập nhật OB.",
  alternates: { canonical: `${siteConfig.url}/content-roadmap` },
  openGraph: {
    title: "Lịch nội dung Free Fire sắp ra — Roadmap | Arex",
    description: "Lịch nội dung Free Fire sắp ra mắt: nhân vật mới, skin, chế độ chơi, sự kiện và bản cập nhật OB.",
    url: `${siteConfig.url}/content-roadmap`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default function LichNoiDungPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Lịch nội dung", href: "/content-roadmap" }]} />

      <PageHero
        icon={Map}
        eyebrow="Roadmap Free Fire"
        title="Nội dung sắp ra"
        subtitle="Nhân vật, skin, chế độ, sự kiện và bản cập nhật sắp đến."
      />

      {FF_ROADMAP.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có mốc nội dung nào.</p>
        </div>
      ) : (
        <RoadmapList items={FF_ROADMAP} />
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Thông tin tham khảo từ thông báo chính thức/leak, có thể thay đổi.
      </p>
    </main>
  );
}
