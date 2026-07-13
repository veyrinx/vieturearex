import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { getWeaponsForCompare } from "@/lib/data/ff-data";
import { WeaponCompare } from "@/components/ff-items/weapon-compare";

export const metadata: Metadata = {
  title: "So sánh vũ khí Free Fire — Đối chiếu chỉ số | Arex",
  description:
    "Chọn 2 vũ khí Free Fire để so sánh trực tiếp sát thương, tầm bắn, tốc độ bắn, tốc độ thay đạn và băng đạn.",
  alternates: { canonical: `${siteConfig.url}/vu-khi/so-sanh` },
};

export default async function WeaponComparePage() {
  const weapons = await getWeaponsForCompare();

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Link
        href="/vu-khi"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Danh sách vũ khí
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Scale className="size-5" />
        </div>
        <SectionHeading title="So sánh vũ khí" eyebrow="Đối chiếu chỉ số" align="left" />
      </div>

      {weapons.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Cần ít nhất 2 vũ khí để so sánh.</p>
        </div>
      ) : (
        <WeaponCompare weapons={weapons} />
      )}
    </main>
  );
}
