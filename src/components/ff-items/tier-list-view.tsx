"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ListChecks, Swords, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PublicTierList } from "@/lib/data/tier-lists";

const TIER_META: Record<string, { color: string; shadow: string }> = {
  S: { color: "bg-[#ff7f7f]", shadow: "shadow-[0_0_12px_#ff7f7f]" },
  A: { color: "bg-[#ffbf7f]", shadow: "shadow-[0_0_12px_#ffbf7f]" },
  B: { color: "bg-[#ffff7f]", shadow: "shadow-[0_0_12px_#ffff7f]" },
  C: { color: "bg-[#7fff7f]", shadow: "shadow-[0_0_12px_#7fff7f]" },
  D: { color: "bg-[#7fbfff]", shadow: "shadow-[0_0_12px_#7fbfff]" },
};

const TIERS = ["S", "A", "B", "C", "D"] as const;

type Props = {
  initialTierLists: PublicTierList[];
};

function TierListCard({ list }: { list: PublicTierList }) {
  const itemsByTier = TIERS.map((tier) => ({
    tier,
    items: list.entries.filter((e) => e.tier === tier),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
          {list.kind === "character" ? "Nhân Vật" : "Vũ Khí"}
        </h3>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary dark:text-amber-400">
          OB{list.patch}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          Cập nhật: {new Date(list.updated_at).toLocaleDateString("vi-VN")}
        </span>
      </div>

      <div className="space-y-1">
        {itemsByTier.map(({ tier, items }) => (
          <div key={tier} className="grid grid-cols-[32px_1fr] items-start gap-2">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-md text-sm font-black text-background",
              TIER_META[tier].color,
              TIER_META[tier].shadow,
            )}>
              {tier}
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5 rounded-md bg-muted/40 p-1.5">
              {items.length === 0 ? (
                <span className="px-2 py-1 text-xs text-muted-foreground/60">Trống</span>
              ) : (
                items.map((item) =>
                  item.slug ? (
                    <Link key={item.id} href={`/weapons/${item.slug}`} className="group relative" title={item.name}>
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-md object-contain ring-primary/0 transition-all group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary/60"
                      />
                    </Link>
                  ) : (
                    <div key={item.id} className="group relative" title={item.name}>
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-md object-contain transition-transform group-hover:scale-105"
                      />
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TierListView({ initialTierLists }: Props) {
  const [kind, setKind] = useState<"all" | "character" | "weapon">("all");
  const [patch, setPatch] = useState("all");

  const availablePatches = useMemo(() => {
    const patches = new Set(initialTierLists.map((list) => list.patch));
    return Array.from(patches).sort((a, b) => Number(b) - Number(a));
  }, [initialTierLists]);

  const filteredLists = useMemo(() => {
    return initialTierLists.filter((list) => {
      const kindMatch = kind === "all" || list.kind === kind;
      const patchMatch = patch === "all" || list.patch === patch;
      return kindMatch && patchMatch;
    });
  }, [initialTierLists, kind, patch]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setKind("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              kind === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <ListChecks className="size-3.5" /> Tất cả
          </button>
          <button
            onClick={() => setKind("character")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              kind === "character" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Users className="size-3.5" /> Nhân Vật
          </button>
          <button
            onClick={() => setKind("weapon")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              kind === "weapon" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Swords className="size-3.5" /> Vũ Khí
          </button>
        </div>

        <div className="h-6 w-px bg-border/50" />

        <Select value={patch} onValueChange={(v) => setPatch(v ?? "all")}>
          <SelectTrigger className="w-40 rounded-lg border-border bg-muted/50 text-xs font-semibold">
            <SelectValue placeholder="Chọn phiên bản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phiên bản</SelectItem>
            {availablePatches.map((p) => (
              <SelectItem key={p} value={p}>
                Phiên bản OB{p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filteredLists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy bảng xếp hạng nào.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredLists.map((list) => (
            <TierListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
