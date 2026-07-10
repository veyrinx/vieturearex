"use client";

import { useMemo, useState } from "react";
import { Search, X, Swords, HeartHandshake, HeartPulse, Wind, Shield, Radar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  FF_CHARACTERS, TIER_ORDER, TIER_META, ROLE_META,
  type CharRole, type FFCharacter,
} from "@/lib/data/ff-characters";

const ROLE_ICONS: Record<CharRole, React.ElementType> = {
  rush: Swords,
  support: HeartHandshake,
  heal: HeartPulse,
  mobility: Wind,
  defense: Shield,
  info: Radar,
};

const ROLE_KEYS = Object.keys(ROLE_META) as CharRole[];

export function CharacterTierList() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<CharRole | "all">("all");
  const [selected, setSelected] = useState<FFCharacter | null>(null);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      FF_CHARACTERS.filter((c) => {
        if (role !== "all" && c.role !== role) return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.skill.toLowerCase().includes(q)) return false;
        return true;
      }),
    [role, q],
  );

  const byTier = useMemo(() => {
    const map = new Map<string, FFCharacter[]>();
    for (const t of TIER_ORDER) map.set(t, []);
    for (const c of filtered) map.get(c.tier)?.push(c);
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân vật hoặc kỹ năng..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={role === "all"} onClick={() => setRole("all")}>
            Tất cả vai trò
          </FilterChip>
          {ROLE_KEYS.map((r) => {
            const meta = ROLE_META[r];
            const Icon = ROLE_ICONS[r];
            return (
              <FilterChip key={r} active={role === r} onClick={() => setRole(r)}>
                <Icon className={cn("size-3", role === r ? meta.text : "")} />
                {meta.label}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {/* Các band tier */}
      <div className="space-y-3">
        {TIER_ORDER.map((tier) => {
          const chars = byTier.get(tier) ?? [];
          const meta = TIER_META[tier];
          return (
            <div
              key={tier}
              className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3"
            >
              {/* Nhãn tier */}
              <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-sm",
                    meta.bar,
                  )}
                >
                  {tier}
                </span>
                <span className={cn("text-[9px] font-bold uppercase tracking-wide", meta.text)}>
                  {meta.label}
                </span>
              </div>

              {/* Nhân vật */}
              <div className="flex min-h-[3.5rem] flex-1 flex-wrap content-start gap-1.5">
                {chars.length === 0 ? (
                  <span className="self-center px-1 text-xs text-muted-foreground/60">—</span>
                ) : (
                  chars.map((c) => (
                    <CharChip key={c.name} char={c} onClick={() => setSelected(c)} />
                  ))
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Không tìm thấy nhân vật phù hợp.
          </div>
        )}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
        * Bảng xếp hạng mang tính <span className="font-semibold">tham khảo</span> theo đánh giá cộng đồng,
        meta có thể thay đổi theo từng mùa cập nhật.
      </p>

      {/* Modal chi tiết */}
      <AnimatePresence>
        {selected && <CharDetail char={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all",
        active
          ? "bg-foreground text-background"
          : "border border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CharChip({ char, onClick }: { char: FFCharacter; onClick: () => void }) {
  const role = ROLE_META[char.role];
  const Icon = ROLE_ICONS[char.role];
  return (
    <button
      onClick={onClick}
      title={char.skill}
      className="group flex items-center gap-2 rounded-xl border border-border bg-muted/30 py-1.5 pl-1.5 pr-3 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-black", role.bg, role.text)}>
        {char.name.charAt(0)}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-xs font-bold text-foreground">{char.name}</span>
        <span className={cn("flex items-center gap-0.5 text-[9px] font-semibold", role.text)}>
          <Icon className="size-2.5" /> {role.label}
        </span>
      </span>
    </button>
  );
}

function CharDetail({ char, onClose }: { char: FFCharacter; onClose: () => void }) {
  const role = ROLE_META[char.role];
  const tier = TIER_META[char.tier];
  const Icon = ROLE_ICONS[char.role];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-4 border-b border-border p-5">
          <span className={cn("flex size-16 shrink-0 items-center justify-center rounded-2xl font-heading text-3xl font-black", role.bg, role.text)}>
            {char.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">{char.name}</h3>
              <span className={cn("flex size-6 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white", tier.bar)}>
                {char.tier}
              </span>
            </div>
            <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", role.bg, role.text)}>
              <Icon className="size-3" /> {role.label}
            </span>
          </div>
          <button onClick={onClose} className="ml-auto self-start rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kỹ năng</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{char.skill}</p>
          <p className={cn("mt-4 text-xs font-semibold", tier.text)}>
            Đánh giá: {char.tier} · {tier.label}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
