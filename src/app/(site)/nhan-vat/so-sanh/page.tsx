import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getAllCharacters } from "@/lib/data/ff-characters";
import { CharacterCompare } from "@/components/ff-items/character-compare";

export const metadata: Metadata = {
  title: "So sánh nhân vật Free Fire — Đối chiếu tier & kỹ năng | Arex",
  description:
    "Chọn 2 nhân vật Free Fire để so sánh trực tiếp tier, vai trò, loại kỹ năng và mô tả kỹ năng.",
  alternates: { canonical: `${siteConfig.url}/nhan-vat/so-sanh` },
};

export default function CharacterComparePage() {
  const characters = getAllCharacters();

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "Nhân vật", href: "/nhan-vat" }, { name: "So sánh", href: "/nhan-vat/so-sanh" }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Scale className="size-5" />
        </div>
        <SectionHeading title="So sánh nhân vật" eyebrow="Đối chiếu tier & kỹ năng" align="left" />
      </div>

      {characters.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Cần ít nhất 2 nhân vật để so sánh.</p>
        </div>
      ) : (
        <CharacterCompare characters={characters} />
      )}
    </main>
  );
}
