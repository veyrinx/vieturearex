import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { DocItemCard } from "@/components/craftland/doc-item";
import { DOC_SECTIONS, DOCS_SOURCE, DOCS_SYNCED_AT, searchDocs } from "@/lib/data/craftland-docs";
import { CRAFTLAND_ACADEMY } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Tra cứu API Craftland — Craftland Academy",
  description: "Chỉ mục API, module, sự kiện và kiểu dữ liệu của Free Fire Craftland: chữ ký hàm, kiểu tham số, đánh dấu API hết hạn, kèm link tài liệu chính thức.",
  alternates: { canonical: `${siteConfig.url}${CRAFTLAND_ACADEMY}/api` },
};

const nf = new Intl.NumberFormat("vi-VN");

export default async function ApiReferencePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.slice(0, 60) ?? "";
  const results = q ? searchDocs(q) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link href={CRAFTLAND_ACADEMY} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Academy
        </Link>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Tra cứu API Craftland</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Chỉ mục module, hàm, sự kiện và kiểu dữ liệu của Craftland — chữ ký khai báo, kiểu tham số và đánh dấu mục đã hết hạn. Bấm vào tên từng mục để xem chi tiết. Nguồn:{" "}
          <a href={DOCS_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">tài liệu chính thức của Garena</a>.
          Đồng bộ lần cuối {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(DOCS_SYNCED_AT))}.
        </p>
        <form role="search" className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q}
            maxLength={60}
            placeholder="Tên tiếng Việt hoặc tên hàm, VD: LogInfo, người chơi…"
            aria-label="Tìm API"
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      </header>

      {q ? (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length >= 80 ? "80+ kết quả (hiển thị 80 đầu tiên)" : `${results.length} kết quả`} cho “{q}” ·{" "}
            <Link href={`${CRAFTLAND_ACADEMY}/api`} className="text-primary hover:underline">Xem toàn bộ</Link>
          </p>
          {results.map(({ section, group, item }) => (
            <div key={item.slug} className="space-y-1">
              <Link href={`${CRAFTLAND_ACADEMY}/api/${section.key}/${group.key}`} className="text-xs text-muted-foreground hover:text-primary">
                {section.title} › {group.title}
              </Link>
              <DocItemCard item={item} defaultOpen />
            </div>
          ))}
        </section>
      ) : (
        DOC_SECTIONS.map((section) => {
          const total = section.groups.reduce((s, g) => s + g.items.length, 0);
          const obsolete = section.groups.reduce((s, g) => s + g.items.filter((i) => i.obsolete).length, 0);
          return (
            <section key={section.key} className="space-y-3">
              <h2 className="font-heading text-xl font-bold">
                {section.title}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {nf.format(total)} mục{obsolete ? ` · ${obsolete} hết hạn` : ""}
                </span>
              </h2>
              {section.key === "type" ? (
                <ul className="flex flex-wrap gap-1.5">
                  {section.groups.flatMap((g) => g.items).map((t) => (
                    <li key={t.slug}
                      className={`rounded-md border px-2 py-0.5 text-xs ${t.obsolete ? "border-amber-500/40 text-amber-700 dark:text-amber-300" : "border-border"}`}
                      title={t.obsolete ? "Đã hết hạn" : undefined}>
                      {t.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {section.groups.map((g) => {
                    const old = g.items.filter((i) => i.obsolete).length;
                    return (
                      <Link key={g.key} href={`${CRAFTLAND_ACADEMY}/api/${section.key}/${g.key}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:border-primary/40">
                        <span className="font-medium">{g.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {g.items.length}{old ? ` · ${old} hết hạn` : ""}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
