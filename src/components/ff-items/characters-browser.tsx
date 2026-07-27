"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Zap, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROLE_META, TIER_ORDER, splitSkill, type CharacterListItem } from "@/lib/data/ff-characters";

const ALL = "all";

const TIER_BG: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffff7f]",
  C: "bg-[#7fff7f]",
  D: "bg-[#7fbfff]",
};

function normalize(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

export function CharactersBrowser({ characters }: { characters: CharacterListItem[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<string>(ALL);
  const [role, setRole] = useState<string>(ALL);

  const roles = useMemo(() => {
    const present = new Set(characters.map((c) => c.role));
    return (Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).filter((r) => present.has(r));
  }, [characters]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return characters.filter((c) => {
      if (tier !== ALL && c.tier !== tier) return false;
      if (role !== ALL && c.role !== role) return false;
      if (q && !normalize(c.name).includes(q) && !normalize(c.skill).includes(q)) return false;
      return true;
    });
  }, [characters, query, tier, role]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nhân vật theo tên hoặc kỹ năng..."
          className="pl-9"
        />
      </div>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2">
        <Chip active={tier === ALL} onClick={() => setTier(ALL)}>Mọi tier</Chip>
        {TIER_ORDER.map((t) => (
          <Chip key={t} active={tier === t} onClick={() => setTier(t)}>Tier {t}</Chip>
        ))}
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2">
        <Chip active={role === ALL} onClick={() => setRole(ALL)}>Mọi vai trò</Chip>
        {roles.map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>{ROLE_META[r].label}</Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy nhân vật phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const skill = splitSkill(c.skill);
            return (
              <Link
                key={c.slug}
                href={`/characters/${c.slug}`}
                className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted/40">
                  <span className={cn(
                    "absolute left-0.5 top-0.5 z-10 flex size-5 items-center justify-center rounded-md text-[11px] font-black text-background",
                    TIER_BG[c.tier] ?? "bg-muted",
                  )}>
                    {c.tier}
                  </span>
                  {c.image ? (
                    <Image src={c.image} alt={c.name} width={64} height={64} className="size-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl font-black text-muted-foreground">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground">{c.name}</p>
                    <span className={cn("rounded px-1 py-0.5 text-[9px] font-bold uppercase", ROLE_META[c.role].bg, ROLE_META[c.role].text)}>
                      {ROLE_META[c.role].label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
                    {c.skillType === "active" ? <Zap className="size-3" /> : <Circle className="size-2.5" />}
                    {skill.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{skill.desc}</p>
                </div>
              </Link>
            );
          })}
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
