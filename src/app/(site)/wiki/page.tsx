import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import Image from "next/image";
import { BookOpenText, PenLine, Eye, Users2, Layers } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Wiki Cộng Đồng | Arex",
  description: "Kho kiến thức Free Fire do cộng đồng Arex đóng góp và duy trì.",
  alternates: { canonical: `${siteConfig.url}/wiki` },
};

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  cover_url: string | null;
  author_name: string;
  author_id: string | null;
  view_count: number;
  updated_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ArticleCard({ article }: { article: WikiArticle }) {
  return (
    <Link
      href={`/wiki/${article.slug}`}
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-md hover:-translate-y-0.5"
    >
      {article.cover_url && (
        <Image
          src={article.cover_url}
          alt={article.title}
          width={400}
          height={128}
          unoptimized
          className="h-32 w-full rounded-xl object-cover"
        />
      )}
      <div className="space-y-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground">{article.author_name}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-[10px] text-muted-foreground">{formatDate(article.updated_at)}</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Eye className="size-3" />
          {article.view_count.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

export default async function WikiPage() {
  const db = createAdminSupabaseClient();

  let articles: WikiArticle[] = [];

  if (db) {
    const { data } = await untypedFrom(db, "wiki_articles")
      .select("id, slug, title, excerpt, category, cover_url, author_name, author_id, view_count, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(200) as { data: WikiArticle[] | null };
    articles = data ?? [];
  }

  // Group by category
  const grouped = articles.reduce<Record<string, WikiArticle[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  const categories = Object.keys(grouped);
  const totalContributors = new Set(articles.map((a) => a.author_id).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Arex Wiki</p>
            <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              Wiki Cộng Đồng
            </h1>
            <p className="text-sm text-muted-foreground">
              Kho kiến thức Free Fire do cộng đồng đóng góp và duy trì
            </p>
          </div>
          <Link
            href="/wiki/tao-bai"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 md:self-auto"
          >
            <PenLine className="size-4" />
            Viết bài
          </Link>
        </div>

        {/* Stats bar */}
        <div className="relative mt-6 flex flex-wrap gap-4">
          {[
            { icon: BookOpenText, label: "Bài viết",    value: articles.length },
            { icon: Users2,       label: "Đóng góp",    value: totalContributors },
            { icon: Layers,       label: "Chủ đề",      value: categories.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 backdrop-blur-sm">
              <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-heading text-sm font-black text-emerald-600 dark:text-emerald-400">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {articles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-base font-semibold text-muted-foreground">Wiki chưa có bài viết nào</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Hãy là người đầu tiên đóng góp kiến thức!</p>
          <Link
            href="/wiki/tao-bai"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <PenLine className="size-4" />
            Viết bài đầu tiên
          </Link>
        </div>
      )}

      {/* Category sections */}
      {categories.map((cat) => (
        <section key={cat} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{cat}</h2>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {grouped[cat].length}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[cat].map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
