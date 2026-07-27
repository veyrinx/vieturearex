import Link from "next/link";
import Image from "next/image";
import { Flame, Layers } from "lucide-react";
import { weaponTypeLabel, playstyleLabel } from "@/lib/constants/weapon-types";
import type { WeaponListItem, Loadout } from "@/lib/data/ff-data";

const TIER_BG: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
};

/**
 * Khối "Meta hiện tại" ở đầu trang /weapons: nổi bật vũ khí tier S và vài combo đề xuất.
 * Server component — chỉ hiển thị khi có dữ liệu tier S.
 */
export function WeaponsMetaHighlight({
  weapons,
  loadouts,
}: {
  weapons: WeaponListItem[];
  loadouts: Loadout[];
}) {
  const topWeapons = weapons.filter((w) => w.tier === "S").slice(0, 6);
  const topLoadouts = loadouts.slice(0, 3);

  if (topWeapons.length === 0 && topLoadouts.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-black uppercase tracking-[0.15em] text-foreground">
          Meta hiện tại
        </h2>
      </div>

      {topWeapons.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Vũ khí tier S</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {topWeapons.map((w) => (
              <Link
                key={w.id}
                href={`/weapons/${w.slug}`}
                className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-2 transition-colors hover:border-primary/50"
              >
                <div className="relative flex size-16 items-center justify-center rounded-xl bg-muted/40">
                  <span className={`absolute left-1 top-1 flex size-5 items-center justify-center rounded-md text-[11px] font-black text-background ${TIER_BG[w.tier ?? "S"] ?? "bg-muted"}`}>
                    {w.tier}
                  </span>
                  <Image src={w.image_url} alt={w.name} width={64} height={64} className="size-full object-contain p-1 transition-transform group-hover:scale-105" />
                </div>
                <p className="truncate text-center text-[11px] font-bold uppercase tracking-wide text-foreground">{w.name}</p>
                {weaponTypeLabel(w.weapon_type) && (
                  <p className="truncate text-center text-[10px] text-muted-foreground">{weaponTypeLabel(w.weapon_type)}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {topLoadouts.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Combo đề xuất</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {topLoadouts.map((l) => (
              <Link
                key={l.id}
                href={`/weapons/loadout/${l.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition-colors hover:border-primary/50"
              >
                <div className="flex -space-x-2">
                  {[l.primary_weapon, l.secondary_weapon].filter(Boolean).map((w, i) => (
                    <div key={i} className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
                      <Image src={w!.image_url} alt={w!.name} width={40} height={40} className="size-full object-contain p-1" />
                    </div>
                  ))}
                  {!l.primary_weapon && !l.secondary_weapon && (
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                      <Layers className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">{l.name}</p>
                  {playstyleLabel(l.playstyle) && (
                    <p className="truncate text-[10px] text-muted-foreground">{playstyleLabel(l.playstyle)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
