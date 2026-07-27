"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Wrench, X, History } from "lucide-react";
import { TOOLS, TOOL_CATEGORIES, type Tool, type ToolCategory } from "@/lib/constants/tools";
import { findFeatureLock, LOCK_LABELS, type FeatureLock } from "@/lib/constants/feature-locks";
import { cn } from "@/lib/utils";

const RECENT_KEY = "arex.tools.recent";
const RECENT_MAX = 4;

/** Dấu thanh tách ra sau khi normalize NFD. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Bỏ dấu để gõ không dấu vẫn tìm được ("do nhay" → "Chỉnh Độ Nhạy"). */
function deburr(s: string) {
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function matches(tool: Tool, query: string) {
  const q = deburr(query.trim());
  if (!q) return true;
  const haystack = deburr(
    [tool.title, tool.desc, tool.shortDesc ?? "", ...(tool.keywords ?? []), tool.href].join(" "),
  );
  // Mọi từ trong ô tìm kiếm đều phải xuất hiện — gõ "tra nick" vẫn ra "Tra Cứu Nick".
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function ToolCard({ tool, lock, onOpen }: { tool: Tool; lock: FeatureLock | null; onOpen: (href: string) => void }) {
  const Icon = tool.icon;
  const badge = (
    <div className={cn("flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110", tool.accent)}>
      <Icon className="size-6" />
    </div>
  );

  if (lock) {
    return (
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 p-5 opacity-70">
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
          <Wrench className="size-3" /> {LOCK_LABELS[lock.status ?? "maintenance"]}
        </span>
        {badge}
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{tool.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{tool.desc}</p>
        </div>
        <span className="mt-auto text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
          Tạm thời chưa mở
        </span>
      </div>
    );
  }

  return (
    <Link
      href={tool.href}
      onClick={() => onOpen(tool.href)}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
    >
      {tool.badge && (
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
            tool.badge === "HOT"
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {tool.badge}
        </span>
      )}
      {badge}
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{tool.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{tool.desc}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
        Mở công cụ
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function ToolsExplorer({ featureLocks }: { featureLocks: FeatureLock[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [recent, setRecent] = useState<string[]>([]);

  // Đọc sau khi mount để tránh lệch nội dung giữa server và client.
  useEffect(() => setRecent(readRecent()), []);

  const rememberOpen = (href: string) => {
    const next = [href, ...recent.filter((h) => h !== href)].slice(0, RECENT_MAX);
    setRecent(next);
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* hết quota thì thôi */ }
  };

  const lockOf = useMemo(() => {
    const map = new Map<string, FeatureLock | null>();
    for (const tool of TOOLS) map.set(tool.href, findFeatureLock(tool.href, featureLocks));
    return map;
  }, [featureLocks]);

  const visible = useMemo(
    () => TOOLS.filter((t) => (category === "all" || t.category === category) && matches(t, query)),
    [query, category],
  );

  // Chỉ gợi ý "dùng gần đây" khi người dùng chưa lọc gì.
  const recentTools = useMemo(() => {
    if (query.trim() || category !== "all") return [];
    return recent
      .map((href) => TOOLS.find((t) => t.href === href))
      .filter((t): t is Tool => Boolean(t) && !lockOf.get(t!.href));
  }, [recent, query, category, lockOf]);

  const countOf = (id: ToolCategory | "all") =>
    id === "all" ? TOOLS.length : TOOLS.filter((t) => t.category === id).length;

  return (
    <div className="space-y-6">
      {/* Ô tìm kiếm */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Tìm công cụ — tên, chức năng, hoặc gõ không dấu…"
          aria-label="Tìm công cụ"
          className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 dark:focus:border-amber-400/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Xoá tìm kiếm"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Lọc theo nhóm */}
      <div className="flex flex-wrap gap-2">
        {([{ id: "all" as const, label: "Tất cả" }, ...TOOL_CATEGORIES]).map(({ id, label }) => {
          const active = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-400"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
              <span className="ml-1.5 opacity-60">{countOf(id)}</span>
            </button>
          );
        })}
      </div>

      {/* Dùng gần đây */}
      {recentTools.length > 0 && (
        <div className="space-y-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <History className="size-3.5" /> Dùng gần đây
          </p>
          <div className="flex flex-wrap gap-2">
            {recentTools.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => rememberOpen(t.href)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <Icon className="size-3.5" />
                  {t.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Lưới công cụ */}
      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((tool) => (
            <ToolCard key={tool.href} tool={tool} lock={lockOf.get(tool.href) ?? null} onOpen={rememberOpen} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <Search className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">Không tìm thấy công cụ nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử từ khoá khác, hoặc{" "}
            <button
              type="button"
              onClick={() => { setQuery(""); setCategory("all"); }}
              className="font-semibold text-primary underline-offset-2 hover:underline dark:text-amber-400"
            >
              xem tất cả {TOOLS.length} công cụ
            </button>
            .
          </p>
        </div>
      )}
    </div>
  );
}
