import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Layers, Plus } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { getAllLoadouts, type LoadoutWeaponRef } from "@/lib/data/ff-data";
import { playstyleLabel, weaponTypeLabel } from "@/lib/constants/weapon-types";

export const metadata: Metadata = {
  title: "Combo vũ khí Free Fire — Loadout theo lối chơi | Arex",
  description:
    "Các bộ combo vũ khí Free Fire (súng chính + phụ) gợi ý theo lối chơi rush, bắn tỉa, hỗ trợ — kèm chỉ dẫn cách dùng.",
  alternates: { canonical: `${siteConfig.url}/vu-khi/loadout` },
};

function WeaponSlot({ weapon }: { weapon: LoadoutWeaponRef }) {
  if (!weapon) {
    return (
      <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
          <Layers className="size-5" />
        </div>
        <p className="text-[11px] text-muted-foreground">Trống</p>
      </div>
    );
  }
  return (
    <Link
      href={`/vu-khi/${weapon.slug}`}
      className="group flex flex-1 flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50"
    >
      <div className="flex size-12 items-center justify-center rounded-lg bg-muted/40">
        <Image src={weapon.image_url} alt={weapon.name} width={48} height={48} className="size-full object-contain p-1 transition-transform group-hover:scale-105" />
      </div>
      <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">{weapon.name}</p>
      {weaponTypeLabel(weapon.weapon_type) && (
        <p className="text-[10px] text-muted-foreground">{weaponTypeLabel(weapon.weapon_type)}</p>
      )}
    </Link>
  );
}

export default async function LoadoutPage() {
  const loadouts = await getAllLoadouts();

  return (
    <main className="container-main my-8 space-y-8">
      <Link
        href="/vu-khi"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Danh sách vũ khí
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="size-5" />
        </div>
        <SectionHeading title="Combo vũ khí" eyebrow="Loadout theo lối chơi" align="left" />
      </div>

      {loadouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có combo nào được cập nhật.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loadouts.map((l) => (
            <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/vu-khi/loadout/${l.slug}`}
                    className="font-heading text-lg font-bold uppercase tracking-wide text-foreground transition-colors hover:text-primary"
                  >
                    {l.name}
                  </Link>
                  {l.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>}
                </div>
                {playstyleLabel(l.playstyle) && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {playstyleLabel(l.playstyle)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <WeaponSlot weapon={l.primary_weapon} />
                <Plus className="size-4 shrink-0 text-muted-foreground" />
                <WeaponSlot weapon={l.secondary_weapon} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
