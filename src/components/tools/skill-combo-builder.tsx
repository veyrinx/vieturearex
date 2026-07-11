"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search, X, Zap, Shield, Copy, Check, Save, RotateCcw, Plus,
  Swords, HeartHandshake, HeartPulse, Wind, Radar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ROLE_META, skillType, type CharRole, type FFCharacter,
} from "@/lib/data/ff-characters";

const ROLE_ICONS: Record<CharRole, React.ElementType> = {
  rush: Swords, support: HeartHandshake, heal: HeartPulse, mobility: Wind, defense: Shield, info: Radar,
};

const MAX_PASSIVE = 3;
const STORAGE_KEY = "arex_skill_combo";

// Avatar: ảnh chân dung, lỗi/thiếu -> chữ cái đầu
function Avatar({ char, className }: { char: FFCharacter; className: string }) {
  const [err, setErr] = useState(false);
  const role = ROLE_META[char.role];
  if (char.image && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={char.image} alt={char.name} loading="lazy" onError={() => setErr(true)} className={cn("object-cover", className)} />;
  }
  return (
    <span className={cn("flex items-center justify-center font-heading font-black", role.bg, role.text, className)}>
      {char.name.charAt(0)}
    </span>
  );
}

type Preset = { name: string; active: string; passives: string[] };
const PRESETS: Preset[] = [
  { name: "Rush áp sát",     active: "Alok",    passives: ["Hayato", "Jota", "Kelly"] },
  { name: "Trâu bò trụ",     active: "Dimitri", passives: ["Wolfrahh", "Shani", "Antonio"] },
  { name: "Bắn tỉa",         active: "Chrono",  passives: ["Laura", "Dasha", "Wolfrahh"] },
  { name: "Hỗ trợ đồng đội", active: "K",       passives: ["Kapella", "Thiva", "Maxim"] },
];

export function SkillComboBuilder({ characters }: { characters: FFCharacter[] }) {
  const byName = useMemo(() => new Map(characters.map((c) => [c.name, c])), [characters]);
  const actives = useMemo(() => characters.filter((c) => skillType(c.name) === "active"), [characters]);
  const passivesList = useMemo(() => characters.filter((c) => skillType(c.name) === "passive"), [characters]);

  const [active, setActive] = useState<FFCharacter | null>(null);
  const [passives, setPassives] = useState<FFCharacter[]>([]);
  const [tab, setTab] = useState<"active" | "passive">("active");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Nạp combo đã lưu
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { active: string | null; passives: string[] };
      if (p.active && byName.has(p.active)) setActive(byName.get(p.active)!);
      if (Array.isArray(p.passives)) setPassives(p.passives.map((n) => byName.get(n)).filter(Boolean) as FFCharacter[]);
    } catch { /**/ }
  }, [byName]);

  const q = search.trim().toLowerCase();
  const pool = (tab === "active" ? actives : passivesList).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.skill.toLowerCase().includes(q),
  );

  const isPicked = (c: FFCharacter) =>
    active?.name === c.name || passives.some((p) => p.name === c.name);

  const pick = (c: FFCharacter) => {
    if (skillType(c.name) === "active") {
      setActive((cur) => (cur?.name === c.name ? null : c));
      return;
    }
    setPassives((cur) => {
      if (cur.some((p) => p.name === c.name)) return cur.filter((p) => p.name !== c.name);
      if (cur.length >= MAX_PASSIVE) { toast.message("Đã đủ 3 kỹ năng bị động."); return cur; }
      return [...cur, c];
    });
  };

  const applyPreset = (p: Preset) => {
    setActive(byName.get(p.active) ?? null);
    setPassives(p.passives.map((n) => byName.get(n)).filter(Boolean) as FFCharacter[]);
    toast.success(`Đã áp dụng combo "${p.name}"`);
  };

  const reset = () => { setActive(null); setPassives([]); };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: active?.name ?? null, passives: passives.map((p) => p.name) }));
      toast.success("Đã lưu combo của bạn!");
    } catch { toast.error("Không lưu được."); }
  };

  const copy = async () => {
    const lines: string[] = ["⚔️ Combo kỹ năng Free Fire (Arex)"];
    if (active) lines.push(`Chủ động: ${active.name} — ${active.skill}`);
    passives.forEach((p) => lines.push(`Bị động: ${p.name} — ${p.skill}`));
    if (!active && passives.length === 0) { toast.message("Chưa chọn kỹ năng nào."); return; }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success("Đã copy combo!");
      setTimeout(() => setCopied(false), 1600);
    } catch { toast.error("Không copy được."); }
  };

  const roleCount = useMemo(() => {
    const all = [active, ...passives].filter(Boolean) as FFCharacter[];
    const m: Partial<Record<CharRole, number>> = {};
    for (const c of all) m[c.role] = (m[c.role] ?? 0) + 1;
    return m;
  }, [active, passives]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      {/* ── Cột chọn ── */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <TabBtn active={tab === "active"} onClick={() => setTab("active")} icon={Zap}>
            Chủ động ({actives.length})
          </TabBtn>
          <TabBtn active={tab === "passive"} onClick={() => setTab("passive")} icon={Shield}>
            Bị động ({passivesList.length})
          </TabBtn>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân vật hoặc kỹ năng..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Danh sách */}
        <div className="grid max-h-[26rem] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {pool.map((c) => {
            const picked = isPicked(c);
            const role = ROLE_META[c.role];
            const Icon = ROLE_ICONS[c.role];
            return (
              <button
                key={c.name}
                onClick={() => pick(c)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-1.5 text-left transition-all active:scale-[0.98]",
                  picked
                    ? "border-primary/40 bg-primary/8 dark:border-amber-400/40 dark:bg-amber-400/8"
                    : "border-border bg-muted/30 hover:border-primary/25 hover:bg-primary/5",
                )}
              >
                <Avatar char={c} className="size-9 shrink-0 overflow-hidden rounded-lg text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-foreground">{c.name}</span>
                  <span className={cn("flex items-center gap-0.5 text-[9px] font-semibold", role.text)}>
                    <Icon className="size-2.5" /> {role.label}
                  </span>
                </span>
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  picked ? "bg-primary text-white dark:bg-amber-500" : "bg-background text-muted-foreground",
                )}>
                  {picked ? <Check className="size-3" /> : <Plus className="size-3" />}
                </span>
              </button>
            );
          })}
          {pool.length === 0 && (
            <p className="col-span-full py-6 text-center text-xs text-muted-foreground">Không tìm thấy.</p>
          )}
        </div>

        {/* Presets */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Combo gợi ý</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/8 hover:text-primary dark:hover:text-amber-300"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cột combo ── */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 px-5 py-4 dark:from-amber-400/10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent dark:via-amber-400/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary dark:text-amber-400">Đội hình kỹ năng</p>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">Combo của bạn</h2>
          </div>

          <div className="space-y-2.5 p-5">
            <ComboSlot label="Chủ động" icon={Zap} char={active} onRemove={() => setActive(null)} highlight />
            {[0, 1, 2].map((i) => (
              <ComboSlot
                key={i}
                label={`Bị động ${i + 1}`}
                icon={Shield}
                char={passives[i] ?? null}
                onRemove={() => setPassives((cur) => cur.filter((_, idx) => idx !== i))}
              />
            ))}

            {/* Role coverage */}
            {Object.keys(roleCount).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(Object.entries(roleCount) as [CharRole, number][]).map(([r, n]) => {
                  const meta = ROLE_META[r];
                  const Icon = ROLE_ICONS[r];
                  return (
                    <span key={r} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", meta.bg, meta.text)}>
                      <Icon className="size-2.5" /> {meta.label} ×{n}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
            <button onClick={copy} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-90 dark:bg-amber-500">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Đã copy" : "Copy"}
            </button>
            <button onClick={save} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground transition hover:border-primary/30 hover:bg-primary/8">
              <Save className="size-4" /> Lưu
            </button>
            <button onClick={reset} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition hover:bg-muted">
              <RotateCcw className="size-4" /> Xóa
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          * Trong trận bạn trang bị <span className="font-semibold">1 kỹ năng chủ động + 3 bị động</span>.
          Ghép combo hợp lối chơi để tối ưu sức mạnh.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
        active
          ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function ComboSlot({
  label, icon: Icon, char, onRemove, highlight,
}: { label: string; icon: React.ElementType; char: FFCharacter | null; onRemove: () => void; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-2.5 transition-colors",
        char
          ? highlight
            ? "border-primary/40 bg-primary/8 dark:border-amber-400/40 dark:bg-amber-400/8"
            : "border-border bg-muted/30"
          : "border-dashed border-border bg-muted/20",
      )}
    >
      {char ? (
        <>
          <Avatar char={char} className="size-11 shrink-0 overflow-hidden rounded-xl text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
            </div>
            <p className="truncate text-sm font-bold text-foreground">{char.name}</p>
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{char.skill}</p>
          </div>
          <button onClick={onRemove} className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/60 text-muted-foreground/40">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
            <p className="text-xs text-muted-foreground/60">Chưa chọn</p>
          </div>
        </>
      )}
    </div>
  );
}
