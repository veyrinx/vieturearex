import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { TierListView } from "@/components/ff-items/tier-list-view";
import { getPublicTierLists } from "@/lib/data/tier-lists";

export const metadata: Metadata = {
  title: "Tier List Free Fire — Nhân vật & Vũ khí | Arex",
  description:
    "Bảng xếp hạng (tier list) nhân vật và vũ khí Free Fire theo meta cộng đồng: S/A/B/C/D, lọc theo loại và phiên bản OB.",
  alternates: { canonical: `${siteConfig.url}/tier-lists` },
};

export default async function TierListsPage() {
  const tierLists = await getPublicTierLists();

  return (
    <main className="container-main my-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ListChecks className="size-5" />
        </div>
        <SectionHeading
          title="Tier List Free Fire"
          eyebrow="Meta cộng đồng"
          align="left"
        />
      </div>

      <TierListView initialTierLists={tierLists} />
    </main>
  );
}
