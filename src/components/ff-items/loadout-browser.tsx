"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAYSTYLES, playstyleLabel, weaponTypeLabel } from "@/lib/constants/weapon-types";
import type { Loadout, LoadoutWeaponRef } from "@/lib/data/ff-data";

const ALL = "all";

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
      href={`/weapons/${weapon.slug}`}
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

export function LoadoutBrowser({ loadouts }: { loadouts: Loadout[] }) {
  const [playstyle, setPlaystyle] = useState<string>(ALL);

  const availableStyles = useMemo(() => {
    const present = new Set(loadouts.map((l) => l.playstyle).filter(Boolean) as string[]);
    return PLAYSTYLES.filter((p) => present.has(p.value));
  }, [loadouts]);

  const filtered = useMemo(
    () => (playstyle === ALL ? loadouts : loadouts.filter((l) => l.playstyle === playstyle)),
    [loadouts, playstyle],
  );

  return (
    <div className="space-y-6">
      {availableStyles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip active={playstyle === ALL} onClick={() => setPlaystyle(ALL)}>Tất cả</Chip>
          {availableStyles.map((p) => (
            <Chip key={p.value} active={playstyle === p.value} onClick={() => setPlaystyle(p.value)}>
              {p.label}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Không có combo phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((l) => (
            <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/weapons/loadout/${l.slug}`}
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
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
