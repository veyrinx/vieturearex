import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Phân trang bằng link (giữ nguyên các tham số lọc khác trên URL). */
export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const window = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const shown = Array.from(window).sort((a, b) => a - b);

  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-medium transition hover:border-primary/40";

  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={item} aria-label="Trang trước"><ChevronLeft className="size-4" /></Link>
      ) : (
        <span className={cn(item, "pointer-events-none opacity-40")} aria-hidden><ChevronLeft className="size-4" /></span>
      )}
      {shown.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && shown[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page && "border-primary bg-primary text-primary-foreground hover:border-primary")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={item} aria-label="Trang sau"><ChevronRight className="size-4" /></Link>
      ) : (
        <span className={cn(item, "pointer-events-none opacity-40")} aria-hidden><ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}
