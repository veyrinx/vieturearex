"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Target, ArrowDownUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WEAPON_TYPES, weaponTypeLabel } from "@/lib/constants/weapon-types";
import type { WeaponListItem } from "@/lib/data/ff-data";

type SortKey = "name" | "damage" | "range";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Tên (A-Z)" },
  { value: "damage", label: "Sát thương cao nhất" },
  { value: "range", label: "Tầm bắn xa nhất" },
];

const ALL = "all";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const TIER_BG: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffff7f]",
  C: "bg-[#7fff7f]",
  D: "bg-[#7fbfff]",
};

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

export function WeaponsBrowser({ weapons }: { weapons: WeaponListItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [type, setType] = useState<string>(ALL);
  const [tier, setTier] = useState<string>(ALL);

  // Chỉ hiện chip cho các thể loại thực sự có vũ khí.
  const availableTypes = useMemo(() => {
    const present = new Set(weapons.map((w) => w.weapon_type).filter(Boolean) as string[]);
    return WEAPON_TYPES.filter((t) => present.has(t.value));
  }, [weapons]);

  const hasTiers = useMemo(() => weapons.some((w) => w.tier), [weapons]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = weapons.filter((w) => {
      if (type !== ALL && w.weapon_type !== type) return false;
      if (tier !== ALL && w.tier !== tier) return false;
      if (q && !normalize(w.name).includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      const av = a[sort] ?? -1;
      const bv = b[sort] ?? -1;
      return bv - av;
    });

    return list;
  }, [weapons, query, sort, type, tier]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm vũ khí theo tên..."
            className="pl-9"
          />
        </div>
        {hasTiers && (
          <Select value={tier} onValueChange={(v) => setTier(v ?? ALL)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi tier</SelectItem>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  Tier {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-56">
            <ArrowDownUp className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <TypeChip active={type === ALL} onClick={() => setType(ALL)}>
            Tất cả
          </TypeChip>
          {availableTypes.map((t) => (
            <TypeChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
              {t.label}
            </TypeChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy vũ khí phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/vu-khi/${w.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="relative mx-auto flex size-24 items-center justify-center rounded-2xl bg-muted/40">
                {w.tier && (
                  <span
                    className={cn(
                      "absolute left-1 top-1 flex size-6 items-center justify-center rounded-md text-xs font-black text-background",
                      TIER_BG[w.tier] ?? "bg-muted",
                    )}
                  >
                    {w.tier}
                  </span>
                )}
                {w.ob && (
                  <span className="absolute right-1 top-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {w.ob}
                  </span>
                )}
                <Image
                  src={w.image_url}
                  alt={w.name}
                  width={96}
                  height={96}
                  className="size-full object-contain p-2 transition-transform group-hover:scale-105"
                />
              </div>
              <p className="mt-3 truncate text-center font-heading text-sm font-bold uppercase tracking-wide text-foreground">
                {w.name}
              </p>
              {weaponTypeLabel(w.weapon_type) && (
                <p className="mt-0.5 truncate text-center text-[11px] text-muted-foreground">
                  {weaponTypeLabel(w.weapon_type)}
                </p>
              )}
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Target className="size-3" /> Sát thương {w.damage ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
