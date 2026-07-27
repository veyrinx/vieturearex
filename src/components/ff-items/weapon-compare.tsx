"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swords } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { weaponTypeLabel } from "@/lib/constants/weapon-types";
import type { WeaponCompareItem } from "@/lib/data/ff-data";

// Tất cả chỉ số: cao hơn = tốt hơn.
const STAT_ROWS: { key: keyof WeaponCompareItem; label: string }[] = [
  { key: "damage", label: "Sát thương" },
  { key: "range", label: "Tầm bắn" },
  { key: "rate_of_fire", label: "Tốc độ bắn" },
  { key: "reload", label: "Tốc độ thay đạn" },
  { key: "magazine", label: "Băng đạn" },
];

function WeaponPicker({
  weapons,
  value,
  exclude,
  onChange,
  placeholder,
}: {
  weapons: WeaponCompareItem[];
  value: string;
  exclude: string;
  onChange: (slug: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {weapons
          .filter((w) => w.slug !== exclude)
          .map((w) => (
            <SelectItem key={w.id} value={w.slug}>
              {w.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function WeaponHead({ weapon }: { weapon: WeaponCompareItem | null }) {
  if (!weapon) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
          <Swords className="size-6" />
        </div>
        <p className="text-xs text-muted-foreground">Chưa chọn</p>
      </div>
    );
  }
  return (
    <Link
      href={`/weapons/${weapon.slug}`}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/50"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/40">
        <Image src={weapon.image_url} alt={weapon.name} width={64} height={64} className="size-full object-contain p-1" />
      </div>
      <p className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">{weapon.name}</p>
      {weaponTypeLabel(weapon.weapon_type) && (
        <p className="text-[11px] text-muted-foreground">{weaponTypeLabel(weapon.weapon_type)}</p>
      )}
    </Link>
  );
}

export function WeaponCompare({ weapons }: { weapons: WeaponCompareItem[] }) {
  const [slugA, setSlugA] = useState("");
  const [slugB, setSlugB] = useState("");

  const weaponA = useMemo(() => weapons.find((w) => w.slug === slugA) ?? null, [weapons, slugA]);
  const weaponB = useMemo(() => weapons.find((w) => w.slug === slugB) ?? null, [weapons, slugB]);
  const hasBoth = !!weaponA && !!weaponB;

  return (
    <div className="space-y-6">
      {/* Pickers */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <WeaponPicker weapons={weapons} value={slugA} exclude={slugB} onChange={setSlugA} placeholder="Chọn vũ khí A" />
        <span className="font-heading text-xs font-black uppercase text-muted-foreground">VS</span>
        <WeaponPicker weapons={weapons} value={slugB} exclude={slugA} onChange={setSlugB} placeholder="Chọn vũ khí B" />
      </div>

      {/* Heads */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <WeaponHead weapon={weaponA} />
        <div className="flex items-center">
          <div className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-card">
            <span className="font-heading text-xs font-black uppercase text-muted-foreground">VS</span>
          </div>
        </div>
        <WeaponHead weapon={weaponB} />
      </div>

      {/* Stat table */}
      {hasBoth ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {STAT_ROWS.map(({ key, label }, idx) => {
            const rawA = weaponA[key];
            const rawB = weaponB[key];
            const numA = typeof rawA === "number" ? rawA : null;
            const numB = typeof rawB === "number" ? rawB : null;
            const aWins = numA != null && numB != null && numA > numB;
            const bWins = numA != null && numB != null && numB > numA;

            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3",
                  idx % 2 === 0 ? "bg-muted/30" : "",
                )}
              >
                <div className={cn("text-right text-sm font-bold tabular-nums", aWins ? "text-primary" : "text-muted-foreground")}>
                  {numA ?? "—"}
                </div>
                <div className="min-w-[110px] text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className={cn("text-left text-sm font-bold tabular-nums", bWins ? "text-primary" : "text-muted-foreground")}>
                  {numB ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Swords className="mx-auto mb-3 size-8 opacity-30" />
          <p className="text-sm">Chọn đủ 2 vũ khí để so sánh chỉ số.</p>
        </div>
      )}
    </div>
  );
}
