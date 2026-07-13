"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserRound, Zap, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROLE_META, TIER_META, splitSkill, type CharacterListItem } from "@/lib/data/ff-characters";

const TIER_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

const TIER_BG: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffff7f]",
  C: "bg-[#7fff7f]",
  D: "bg-[#7fbfff]",
};

function Picker({
  characters,
  value,
  exclude,
  onChange,
  placeholder,
}: {
  characters: CharacterListItem[];
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
        {characters
          .filter((c) => c.slug !== exclude)
          .map((c) => (
            <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function Head({ char }: { char: CharacterListItem | null }) {
  if (!char) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
          <UserRound className="size-6" />
        </div>
        <p className="text-xs text-muted-foreground">Chưa chọn</p>
      </div>
    );
  }
  return (
    <Link
      href={`/nhan-vat/${char.slug}`}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/50"
    >
      <div className="relative size-16 overflow-hidden rounded-2xl bg-muted/40">
        <span className={cn(
          "absolute left-0.5 top-0.5 z-10 flex size-5 items-center justify-center rounded-md text-[11px] font-black text-background",
          TIER_BG[char.tier] ?? "bg-muted",
        )}>
          {char.tier}
        </span>
        {char.image ? (
          <Image src={char.image} alt={char.name} width={64} height={64} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xl font-black text-muted-foreground">{char.name.slice(0, 1)}</div>
        )}
      </div>
      <p className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">{char.name}</p>
    </Link>
  );
}

export function CharacterCompare({ characters }: { characters: CharacterListItem[] }) {
  const [slugA, setSlugA] = useState("");
  const [slugB, setSlugB] = useState("");

  const a = useMemo(() => characters.find((c) => c.slug === slugA) ?? null, [characters, slugA]);
  const b = useMemo(() => characters.find((c) => c.slug === slugB) ?? null, [characters, slugB]);
  const hasBoth = !!a && !!b;

  const rows: { label: string; render: (c: CharacterListItem) => React.ReactNode; highlight?: (c: CharacterListItem, other: CharacterListItem) => boolean }[] = [
    {
      label: "Tier",
      render: (c) => `${c.tier} · ${TIER_META[c.tier].label}`,
      highlight: (c, o) => (TIER_RANK[c.tier] ?? 0) > (TIER_RANK[o.tier] ?? 0),
    },
    { label: "Vai trò", render: (c) => ROLE_META[c.role].label },
    { label: "Loại kỹ năng", render: (c) => (c.skillType === "active" ? "Chủ động" : "Bị động") },
    { label: "Kỹ năng", render: (c) => splitSkill(c.skill).name },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Picker characters={characters} value={slugA} exclude={slugB} onChange={setSlugA} placeholder="Chọn nhân vật A" />
        <span className="font-heading text-xs font-black uppercase text-muted-foreground">VS</span>
        <Picker characters={characters} value={slugB} exclude={slugA} onChange={setSlugB} placeholder="Chọn nhân vật B" />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <Head char={a} />
        <div className="flex items-center">
          <div className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-card">
            <span className="font-heading text-xs font-black uppercase text-muted-foreground">VS</span>
          </div>
        </div>
        <Head char={b} />
      </div>

      {hasBoth ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map(({ label, render, highlight }, idx) => {
            const aWin = highlight?.(a, b) ?? false;
            const bWin = highlight?.(b, a) ?? false;
            return (
              <div
                key={label}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3",
                  idx % 2 === 0 ? "bg-muted/30" : "",
                )}
              >
                <div className={cn("text-right text-sm font-bold", aWin ? "text-primary" : "text-foreground")}>
                  {render(a)}
                </div>
                <div className="min-w-[110px] text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className={cn("text-left text-sm font-bold", bWin ? "text-primary" : "text-foreground")}>
                  {render(b)}
                </div>
              </div>
            );
          })}

          {/* Skill descriptions */}
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
            {[a, b].map((c, i) => (
              <div key={i} className="bg-card p-4">
                <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  {c.skillType === "active" ? <Zap className="size-3" /> : <Circle className="size-2.5" />}
                  {splitSkill(c.skill).name}
                </p>
                <p className="text-xs text-muted-foreground">{splitSkill(c.skill).desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <UserRound className="mx-auto mb-3 size-8 opacity-30" />
          <p className="text-sm">Chọn đủ 2 nhân vật để so sánh.</p>
        </div>
      )}
    </div>
  );
}
