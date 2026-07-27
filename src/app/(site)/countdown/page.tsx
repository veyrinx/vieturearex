import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getCountdowns } from "@/lib/server/countdowns";
import { CountdownList } from "@/components/tools/countdown-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đếm ngược sự kiện Free Fire — Cập nhật, reset rank, sự kiện",
  description:
    "Đồng hồ đếm ngược tới bản cập nhật OB mới, reset rank cuối mùa và các sự kiện Free Fire sắp diễn ra.",
  alternates: { canonical: `${siteConfig.url}/countdown` },
  openGraph: {
    title: "Đếm ngược sự kiện Free Fire — Cập nhật, reset rank, sự kiện | Arex",
    description: "Đồng hồ đếm ngược tới bản cập nhật OB mới, reset rank cuối mùa và các sự kiện Free Fire sắp diễn ra.",
    url: `${siteConfig.url}/countdown`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default async function DemNguocPage() {
  const items = (await getCountdowns()).filter((i) => i.enabled !== false);

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Đếm ngược sự kiện", href: "/countdown" }]} />

      <PageHero
        icon={CalendarClock}
        eyebrow="Sắp diễn ra"
        title="Đếm ngược sự kiện"
        subtitle="Đồng hồ đếm ngược tới bản cập nhật OB, reset rank và sự kiện Free Fire."
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có mốc sự kiện nào.</p>
        </div>
      ) : (
        <CountdownList items={items} />
      )}
    </main>
  );
}
