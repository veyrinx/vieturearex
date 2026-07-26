import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ArrowLeft, Eye, PenLine, History, BookOpen, Clock, User } from "lucide-react";
import { RichTextRenderer } from "@/components/news/rich-text-renderer";
import { ShareButtons } from "@/components/news/share-buttons";
import { BookmarkButton } from "@/components/news/bookmark-button";
import { ReadingProgress } from "@/components/news/reading-progress";
import { WikiViewTracker } from "@/components/wiki/wiki-view-tracker";
import { ArticleAd } from "@/components/common/article-ad";
import { siteConfig } from "@/lib/constants/site";
import { sanitizeRichText } from "@/lib/server/sanitize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  cover_url: string | null;
  author_name: string;
  view_count: number;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return { title: "Wiki" };

  const { data } = await untypedFrom(db, "wiki_articles")
    .select("title, excerpt")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle() as { data: { title: string; excerpt: string | null } | null };

  if (!data) return { title: "Wiki" };

  const title = `${data.title} — Wiki`;
  const description = data.excerpt ?? undefined;
  const url = `${siteConfig.url}/wiki/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", siteName: siteConfig.name },
  };
}

export default async function WikiArticlePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = createAdminSupabaseClient();
  if (!db) notFound();

  const { data: article } = await untypedFrom(db, "wiki_articles")
    .select("id, slug, title, content, excerpt, category, cover_url, author_name, view_count, edit_count, created_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle() as { data: WikiArticle | null };

  if (!article) notFound();

  // View tracking handled client-side by WikiViewTracker (more reliable)

  // Related articles — same category, not this one
  const { data: related } = await untypedFrom(db, "wiki_articles")
    .select("slug, title, excerpt, category, author_name")
    .eq("status", "published")
    .eq("category", article.category)
    .neq("slug", article.slug)
    .limit(3) as { data: Array<{ slug: string; title: string; excerpt: string | null; category: string; author_name: string }> | null };

  const isHtml = article.content.trimStart().startsWith("<");
  // Defense-in-depth: strip any unsafe markup at render time so rows stored
  // before content sanitization (or via other paths) can't inject scripts.
  const safeContent = isHtml ? sanitizeRichText(article.content) : article.content;

  const readingTime = Math.max(1, Math.ceil(article.content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200));

  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-6">
      <ReadingProgress />
      <WikiViewTracker slug={article.slug} />
      {/* Back */}
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-emerald-500/40 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Quay lại Wiki
      </Link>

      {/* Article card */}
      <article className="rounded-3xl border border-border bg-card overflow-hidden">
        {/* Cover — with overlay if present */}
        {article.cover_url ? (
          <div className="relative h-56 md:h-80 overflow-hidden">
            <Image
              src={article.cover_url}
              alt={article.title}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 space-y-2">
              <span className="inline-flex rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                {article.category}
              </span>
              <h1 className="font-heading text-2xl font-black leading-snug tracking-tight text-white md:text-3xl drop-shadow-md">
                {article.title}
              </h1>
            </div>
          </div>
        ) : null}

        <div className="p-6 md:p-10 space-y-6">
          {/* Header — without cover */}
          {!article.cover_url && (
            <div className="space-y-3">
              <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {article.category}
              </span>
              <h1 className="font-heading text-2xl font-black leading-snug tracking-tight text-foreground md:text-3xl">
                {article.title}
              </h1>
            </div>
          )}

          {article.excerpt && (
            <p className="text-base text-muted-foreground leading-relaxed border-l-2 border-emerald-500/40 pl-4 italic">
              {article.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <User className="size-3.5" />
              {article.author_name}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>{formatDate(article.created_at)}</span>
            {article.updated_at !== article.created_at && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">Cập nhật {formatDate(article.updated_at)}</span>
              </>
            )}
            <span className="flex items-center gap-1"><Clock className="size-3" />{readingTime} phút đọc</span>
            <span className="ml-auto flex items-center gap-1">
              <Eye className="size-3" />
              {(article.view_count + 1).toLocaleString()} lượt xem
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Content */}
          <div className="min-h-[200px]">
            {isHtml
              ? <RichTextRenderer html={safeContent} />
              : <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{safeContent}</div>
            }
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Share + Bookmark */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <ShareButtons url={`${siteConfig.url}/wiki/${article.slug}`} title={article.title} />
            <BookmarkButton
              itemId={article.slug}
              itemTitle={article.title}
              itemImage={article.cover_url ?? undefined}
              itemType="wiki"
            />
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="size-3.5" />
              {article.edit_count > 0
                ? `Đã chỉnh sửa ${article.edit_count} lần`
                : "Chưa có chỉnh sửa nào"}
            </div>
            <Link
              href={`/wiki/${article.slug}/chinh-sua`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/8 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <PenLine className="size-3.5" />
              Chỉnh sửa bài này
            </Link>
          </div>
        </div>
      </article>

      {/* Quảng cáo trong bài (chỉ hiện khi đã cấu hình slot) */}
      <ArticleAd slotKey="ads.slot_wiki_article" />

      {/* Author card */}
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
          <User className="size-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tác giả đóng góp</p>
          <p className="font-bold text-foreground">{article.author_name}</p>
        </div>
        <Link href={`/wiki?author=${encodeURIComponent(article.author_name)}`}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          Xem bài khác
        </Link>
      </div>

      {/* Related articles */}
      {related && related.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-emerald-500" />
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <BookOpen className="size-3.5" /> Bài viết liên quan
            </h2>
            <span className="ml-auto text-[10px] text-muted-foreground font-semibold">{article.category}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/wiki/${r.slug}`}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5 space-y-2 border-l-4 border-l-emerald-500/30"
              >
                <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {r.category}
                </span>
                <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {r.title}
                </h3>
                {r.excerpt && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{r.excerpt}</p>
                )}
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <User className="size-2.5" /> {r.author_name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom back link */}
      <div className="text-center">
        <Link
          href="/wiki"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-emerald-500/40 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Xem tất cả bài Wiki
        </Link>
      </div>
    </div>
  );
}
