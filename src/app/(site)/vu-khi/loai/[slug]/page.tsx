import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Swords } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getAllWeapons } from "@/lib/data/ff-data";
import { WEAPON_TYPES, weaponTypeLabel } from "@/lib/constants/weapon-types";
import { WeaponsBrowser } from "@/components/ff-items/weapons-browser";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return WEAPON_TYPES.map((t) => ({ slug: t.value }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = weaponTypeLabel(slug);
  if (!label) return { title: "Không tìm thấy" };

  const title = `Vũ khí ${label} Free Fire — Danh sách & Chỉ số`;
  const description = `Tất cả vũ khí loại ${label} trong Free Fire kèm chỉ số sát thương, tầm bắn, tốc độ bắn và tier meta cộng đồng.`;
  const url = `${siteConfig.url}/vu-khi/loai/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: siteConfig.name },
  };
}

export default async function WeaponTypePage({ params }: Props) {
  const { slug } = await params;
  const label = weaponTypeLabel(slug);
  if (!label) notFound();

  const all = await getAllWeapons();
  const weapons = all.filter((w) => w.weapon_type === slug);

  return (
    <main className="container-main my-8 space-y-8">
      <Breadcrumbs items={[{ name: "Vũ khí", href: "/vu-khi" }, { name: label, href: `/vu-khi/loai/${slug}` }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Swords className="size-5" />
        </div>
        <SectionHeading title={`Vũ khí ${label}`} eyebrow="Thể loại" align="left" />
      </div>

      {weapons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có vũ khí loại {label}.</p>
        </div>
      ) : (
        <WeaponsBrowser weapons={weapons} />
      )}
    </main>
  );
}
