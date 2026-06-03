import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { BookOpenText, PenLine, Users2, Layers } from "lucide-react";
import { WikiSearch } from "@/components/wiki/wiki-search";

export const revalidate = 30;

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

  const categories = [...new Set(articles.map((a) => a.category))].sort();
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

      {articles.length === 0 ? (
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
      ) : (
        <WikiSearch articles={articles} categories={categories} />
      )}

    </div>
  );
}
