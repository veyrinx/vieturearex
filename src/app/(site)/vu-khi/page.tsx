import type { Metadata } from "next";
import Link from "next/link";
import { Swords, Scale, Layers } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getAllWeapons, getAllLoadouts } from "@/lib/data/ff-data";
import { WeaponsBrowser } from "@/components/ff-items/weapons-browser";
import { WeaponsMetaHighlight } from "@/components/ff-items/weapons-meta-highlight";

export const metadata: Metadata = {
  title: "Vũ khí Free Fire — Chỉ số & Thông tin chi tiết | Arex",
  description:
    "Danh sách vũ khí Free Fire kèm chỉ số sát thương, tầm bắn, tốc độ bắn và vị trí trong meta cộng đồng.",
  alternates: { canonical: `${siteConfig.url}/vu-khi` },
};

export default async function WeaponsPage() {
  const [weapons, loadouts] = await Promise.all([getAllWeapons(), getAllLoadouts()]);

  return (
    <main className="container-main my-8 space-y-8">
      <Breadcrumbs items={[{ name: "Vũ khí", href: "/vu-khi" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Swords className="size-5" />
          </div>
          <SectionHeading title="Vũ khí Free Fire" eyebrow="Thư viện" align="left" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/vu-khi/loadout"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Layers className="size-4" /> Combo vũ khí
          </Link>
          <Link
            href="/vu-khi/so-sanh"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Scale className="size-4" /> So sánh vũ khí
          </Link>
        </div>
      </div>

      {weapons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có vũ khí nào được cập nhật.</p>
        </div>
      ) : (
        <>
          <WeaponsMetaHighlight weapons={weapons} loadouts={loadouts} />
          <WeaponsBrowser weapons={weapons} />
        </>
      )}
    </main>
  );
}
