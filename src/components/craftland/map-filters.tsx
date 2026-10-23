"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Loader2, Search, X } from "lucide-react";
import { MAP_PERIODS, MAP_SORTS } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

const selectCls =
  "h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Thanh tìm + lọc cho thư viện. Trạng thái nằm trên URL để chia sẻ được link lọc. */
export function MapFilters({ categories }: { categories: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const update = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    startTransition(() => router.push(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false }));
  };

  const view = params.get("view") === "list" ? "list" : "grid";
  const hasFilters = ["q", "category", "sort", "period", "platform"].some((k) => params.get(k));

  return (
    <div className="space-y-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên bản đồ, mã map, creator hoặc từ khoá…"
          aria-label="Tìm bản đồ"
          maxLength={60}
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Tìm
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Thể loại" className={selectCls} value={params.get("category") ?? ""} onChange={(e) => update({ category: e.target.value || null })}>
          <option value="">Mọi thể loại</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select aria-label="Sắp xếp" className={selectCls} value={params.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}>
          {MAP_SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select aria-label="Ngày đăng" className={selectCls} value={params.get("period") ?? "all"} onChange={(e) => update({ period: e.target.value === "all" ? null : e.target.value })}>
          {MAP_PERIODS.map((p) => (
            <option key={p.key} value={p.key}>{p.key === "all" ? "Đăng bất kỳ lúc nào" : `Đăng trong ${p.label}`}</option>
          ))}
        </select>
        <select aria-label="Nền tảng" className={selectCls} value={params.get("platform") ?? ""} onChange={(e) => update({ platform: e.target.value || null })}>
          <option value="">Mọi nền tảng</option>
          <option value="mobile">Mobile (đã xác nhận)</option>
          <option value="pc">PC (đã xác nhận)</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-4" aria-hidden /> Xoá lọc
          </button>
        )}

        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Đang tải" />}

        <div className="ml-auto inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Kiểu hiển thị">
          {(["grid", "list"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGrid : List;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Dạng lưới" : "Dạng danh sách"}
                onClick={() => {
                  const sp = new URLSearchParams(params.toString());
                  if (v === "list") sp.set("view", "list");
                  else sp.delete("view");
                  router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
                }}
                className={cn("rounded-md p-1.5 transition", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
