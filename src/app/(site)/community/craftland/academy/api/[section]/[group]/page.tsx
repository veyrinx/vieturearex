import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocItemCard } from "@/components/craftland/doc-item";
import { DOC_SECTIONS, getDocGroup } from "@/lib/data/craftland-docs";
import { CRAFTLAND_ACADEMY } from "@/lib/constants/craftland";
import { cn } from "@/lib/utils";

type Params = { section: string; group: string };

export function generateStaticParams(): Params[] {
  return DOC_SECTIONS.filter((s) => s.key !== "type").flatMap((s) => s.groups.map((g) => ({ section: s.key, group: g.key })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = getDocGroup((await params).section, (await params).group);
  if (!found) return { title: "Tra cứu API Craftland" };
  return {
    title: `${found.group.title} — ${found.section.title} Craftland`,
    description: `Chỉ mục ${found.group.items.length} mục thuộc ${found.group.title} trong Free Fire Craftland, kèm chữ ký và link tài liệu chính thức.`,
  };
}

export default async function ApiGroupPage({ params }: { params: Promise<Params> }) {
  const { section: sectionKey, group: groupKey } = await params;
  const found = getDocGroup(sectionKey, groupKey);
  if (!found) notFound();
  const { section, group } = found;
  const current = group.items.filter((i) => !i.obsolete);
  const obsolete = group.items.filter((i) => i.obsolete);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav aria-label={section.title} className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-0.5 overflow-y-auto pr-2 text-sm">
          <Link href={`${CRAFTLAND_ACADEMY}/api`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            ← Tra cứu API
          </Link>
          {section.groups.map((g) => (
            <Link key={g.key} href={`${CRAFTLAND_ACADEMY}/api/${section.key}/${g.key}`} aria-current={g.key === group.key ? "page" : undefined}
              className={cn("block rounded-md px-2 py-1 transition hover:bg-muted", g.key === group.key && "bg-primary/10 font-semibold text-primary")}>
              {g.title}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">
            <Link href={`${CRAFTLAND_ACADEMY}/api`} className="hover:text-foreground">Tra cứu API</Link> › {section.title}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold">{group.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.length} mục đang dùng{obsolete.length ? ` · ${obsolete.length} mục hết hạn (ở cuối trang)` : ""}. Bấm vào tên để xem chữ ký và tham số.
          </p>
        </header>

        <div className="space-y-3">
          {current.map((item) => <DocItemCard key={item.slug} item={item} />)}
        </div>

        {obsolete.length > 0 && (
          <details className="rounded-xl border border-amber-500/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-amber-700 dark:text-amber-300">
              {obsolete.length} mục đã hết hạn — chỉ để tham khảo khi sửa dự án cũ
            </summary>
            <div className="mt-3 space-y-3">
              {obsolete.map((item) => <DocItemCard key={item.slug} item={item} />)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
