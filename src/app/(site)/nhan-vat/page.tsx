import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getAllCharacters } from "@/lib/data/ff-characters";
import { CharactersBrowser } from "@/components/ff-items/characters-browser";
import { CharactersMetaHighlight } from "@/components/ff-items/characters-meta-highlight";

export const metadata: Metadata = {
  title: "Nhân vật Free Fire — Kỹ năng & Tier meta | Arex",
  description:
    "Danh sách nhân vật Free Fire kèm kỹ năng (chủ động/bị động), vai trò và vị trí tier trong meta cộng đồng chế độ Sinh Tồn.",
  alternates: { canonical: `${siteConfig.url}/nhan-vat` },
};

export default function CharactersPage() {
  const characters = getAllCharacters();

  return (
    <main className="container-main my-8 space-y-8">
      <Breadcrumbs items={[{ name: "Nhân vật", href: "/nhan-vat" }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </div>
        <SectionHeading title="Nhân vật Free Fire" eyebrow="Thư viện" align="left" />
      </div>

      <CharactersMetaHighlight characters={characters} />
      <CharactersBrowser characters={characters} />
    </main>
  );
}
