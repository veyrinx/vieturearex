import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { ArticleActions, CodeCopyEnhancer, ReadMark } from "@/components/craftland/academy-client";
import { PlatformTag } from "@/components/craftland/platform-tag";
import { RichTextRenderer } from "@/components/news/rich-text-renderer";
import { getAcademyCategories, getPublishedArticle, listPublishedArticles, withToc } from "@/lib/server/craftland-academy";
import { CRAFTLAND_ACADEMY, craftlandAcademyHref } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getPublishedArticle(slug).catch(() => null);
  if (!a) return { title: "Craftland Academy" };
  return {
    title: `${a.title} — Craftland Academy`,
    description: a.excerpt || undefined,
    alternates: { canonical: `${siteConfig.url}${craftlandAcademyHref(slug)}` },
  };
}

export default async function AcademyArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, categories, all] = await Promise.all([
    getPublishedArticle(slug).catch(() => null),
    getAcademyCategories(),
    listPublishedArticles(),
  ]);
  if (!article) notFound();

  const { html, toc } = withToc(article.body);
  const order = new Map(categories.map((c, i) => [c.slug, i]));
  const ordered = [...all].sort((a, b) => (order.get(a.category_slug) ?? 999) - (order.get(b.category_slug) ?? 999) || a.sort_order - b.sort_order);
  const idx = ordered.findIndex((a) => a.id === article.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const category = categories.find((c) => c.slug === article.category_slug);
  const related = ordered.filter((a) => a.category_slug === article.category_slug && a.id !== article.id).slice(0, 5);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_220px]">
      {/* Sidebar danh mục */}
      <aside className="hidden lg:block">
        <nav aria-label="Danh mục Academy" className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pr-2 text-sm">
          {categories.map((c) => {
            const items = ordered.filter((a) => a.category_slug === c.slug);
            if (items.length === 0) return null;
            return (
              <div key={c.slug}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.name}</div>
                <ul className="space-y-0.5">
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={craftlandAcademyHref(a.slug)}
                        aria-current={a.id === article.id ? "page" : undefined}
                        className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-muted", a.id === article.id && "bg-primary/10 font-semibold text-primary")}
                      >
                        <ReadMark articleId={a.id} />
                        <span className="line-clamp-2">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <article className="min-w-0 space-y-6">
        <nav className="text-sm text-muted-foreground">
          <Link href={CRAFTLAND_ACADEMY} className="hover:text-foreground">Academy</Link>
          {category && <><span className="mx-1.5">/</span><Link href={`${CRAFTLAND_ACADEMY}#${category.slug}`} className="hover:text-foreground">{category.name}</Link></>}
        </nav>

        <header className="space-y-3">
          <h1 className="font-heading text-2xl font-extrabold leading-tight md:text-3xl">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <PlatformTag platform={article.platform} />
            <span>Cập nhật {new Intl.DateTimeFormat("vi-VN").format(new Date(article.updated_at))}</span>
          </div>
          <ArticleActions articleId={article.id} />
        </header>

        {article.compat_warning && (
          <div role="note" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{article.compat_warning}</p>
          </div>
        )}

        {toc.length > 1 && (
          <details className="rounded-xl border border-border bg-card p-4 xl:hidden">
            <summary className="cursor-pointer text-sm font-semibold">Mục lục</summary>
            <TocList toc={toc} />
          </details>
        )}

        <CodeCopyEnhancer>
          <RichTextRenderer html={html} />
        </CodeCopyEnhancer>

        {article.sources.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Nguồn tham khảo</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {s.label} <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label="Bài trước / bài sau" className="grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={craftlandAcademyHref(prev.slug)} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" aria-hidden /> Bài trước</span>
              <span className="mt-1 block font-semibold">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={craftlandAcademyHref(next.slug)} className="rounded-xl border border-border bg-card p-4 text-right transition hover:border-primary/40">
              <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">Bài tiếp theo <ArrowRight className="size-3.5" aria-hidden /></span>
              <span className="mt-1 block font-semibold">{next.title}</span>
            </Link>
          )}
        </nav>

        {related.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Bài viết liên quan</h2>
            <ul className="space-y-1 text-sm">
              {related.map((a) => (
                <li key={a.id}><Link href={craftlandAcademyHref(a.slug)} className="text-primary hover:underline">{a.title}</Link></li>
              ))}
            </ul>
          </section>
        )}
      </article>

      {toc.length > 1 && (
        <aside className="hidden xl:block">
          <div className="sticky top-24 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trong bài này</div>
            <TocList toc={toc} />
          </div>
        </aside>
      )}
    </div>
  );
}

function TocList({ toc }: { toc: Array<{ id: string; text: string; level: 2 | 3 }> }) {
  return (
    <ul className="mt-2 space-y-1">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? "pl-3" : undefined}>
          <a href={`#${t.id}`} className="text-muted-foreground transition hover:text-foreground">{t.text}</a>
        </li>
      ))}
    </ul>
  );
}
