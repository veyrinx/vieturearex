import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BreadcrumbJsonLd } from "next-seo";
import { siteConfig } from "@/lib/constants/site";

export type Crumb = { name: string; href: string };

/**
 * Breadcrumb điều hướng + BreadcrumbList JSON-LD (Google hiển thị trong kết quả).
 * `items` là các href tương đối (vd "/vu-khi"); tự động thêm "Trang chủ" ở đầu.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Trang chủ", href: "/" }, ...items];

  return (
    <>
      <BreadcrumbJsonLd
        items={all.map((c) => ({
          name: c.name,
          item: `${siteConfig.url}${c.href === "/" ? "" : c.href}`,
        }))}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" />}
              {last ? (
                <span className="max-w-[220px] truncate font-semibold text-foreground">{c.name}</span>
              ) : (
                <Link href={c.href} className="transition-colors hover:text-foreground">
                  {c.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
