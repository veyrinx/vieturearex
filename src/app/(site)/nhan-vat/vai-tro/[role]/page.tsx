import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getAllCharacters, ROLE_META, type CharRole } from "@/lib/data/ff-characters";
import { CharactersBrowser } from "@/components/ff-items/characters-browser";

type Props = { params: Promise<{ role: string }> };

function isRole(v: string): v is CharRole {
  return Object.prototype.hasOwnProperty.call(ROLE_META, v);
}

export function generateStaticParams() {
  return Object.keys(ROLE_META).map((role) => ({ role }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  if (!isRole(role)) return { title: "Không tìm thấy" };
  const label = ROLE_META[role].label;

  return {
    title: `Nhân vật ${label} Free Fire — Danh sách & Kỹ năng | Arex`,
    description: `Tất cả nhân vật vai trò ${label} trong Free Fire kèm kỹ năng và vị trí tier meta cộng đồng.`,
    alternates: { canonical: `${siteConfig.url}/nhan-vat/vai-tro/${role}` },
  };
}

export default async function CharacterRolePage({ params }: Props) {
  const { role } = await params;
  if (!isRole(role)) notFound();

  const label = ROLE_META[role].label;
  const characters = getAllCharacters().filter((c) => c.role === role);

  return (
    <main className="container-main my-8 space-y-8">
      <Breadcrumbs items={[{ name: "Nhân vật", href: "/nhan-vat" }, { name: label, href: `/nhan-vat/vai-tro/${role}` }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </div>
        <SectionHeading title={`Nhân vật ${label}`} eyebrow="Vai trò" align="left" />
      </div>

      {characters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có nhân vật vai trò {label}.</p>
        </div>
      ) : (
        <CharactersBrowser characters={characters} />
      )}
    </main>
  );
}
