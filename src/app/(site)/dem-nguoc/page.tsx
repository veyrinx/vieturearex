import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { FF_COUNTDOWNS } from "@/lib/data/ff-countdowns";
import { CountdownList } from "@/components/tools/countdown-list";

export const metadata: Metadata = {
  title: "Đếm ngược sự kiện Free Fire — Cập nhật, reset rank, sự kiện | Arex",
  description:
    "Đồng hồ đếm ngược tới bản cập nhật OB mới, reset rank cuối mùa và các sự kiện Free Fire sắp diễn ra.",
  alternates: { canonical: `${siteConfig.url}/dem-nguoc` },
};

export default function DemNguocPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Đếm ngược sự kiện", href: "/dem-nguoc" }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarClock className="size-5" />
        </div>
        <SectionHeading title="Đếm ngược sự kiện" eyebrow="Sắp diễn ra" align="left" />
      </div>

      {FF_COUNTDOWNS.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có mốc sự kiện nào.</p>
        </div>
      ) : (
        <CountdownList items={FF_COUNTDOWNS} />
      )}
    </main>
  );
}
