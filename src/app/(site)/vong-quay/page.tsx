import type { Metadata } from "next";
import { RotateCw } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { LuckRoyaleWheel } from "@/components/tools/luck-royale-wheel";

export const metadata: Metadata = {
  title: "Vòng Quay May Mắn Free Fire — Giả lập Luck Royale | Arex",
  description:
    "Quay thử vòng quay Luck Royale / Faded Wheel Free Fire để xem tốn bao nhiêu kim cương mới trúng đại thưởng. Giả lập cho vui, chơi có trách nhiệm.",
  alternates: { canonical: `${siteConfig.url}/vong-quay` },
};

export default function VongQuayPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Vòng quay may mắn", href: "/vong-quay" }]} />

      <PageHero
        icon={RotateCw}
        eyebrow="Giả lập cho vui"
        title="Vòng Quay May Mắn"
        subtitle="Quay thử Luck Royale — xem tốn bao nhiêu kim cương mới trúng đại thưởng."
      />

      <LuckRoyaleWheel />
    </main>
  );
}
