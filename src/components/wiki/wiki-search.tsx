"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Eye, BookOpenText, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  cover_url: string | null;
  author_name: string;
  view_count: number;
  updated_at: string;
};

type Props = {
  articles: WikiArticle[];
  categories: string[];
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
        <Image src={article.cover_url} alt={article.title} width={400} height={128} unoptimized className="h-32 w-full rounded-xl object-cover" />
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

export function WikiSearch({ articles, categories }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchCat = activeCategory === "all" || a.category === activeCategory;
      const matchQ = !query.trim() ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        (a.excerpt ?? "").toLowerCase().includes(query.toLowerCase()) ||
        a.author_name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [articles, query, activeCategory]);

  // Group filtered results by category
  const grouped = useMemo(() => {
    if (activeCategory !== "all" || query.trim()) {
      return { [activeCategory !== "all" ? activeCategory : "Kết quả"]: filtered };
    }
    return filtered.reduce<Record<string, WikiArticle[]>>((acc, a) => {
      if (!acc[a.category]) acc[a.category] = [];
      acc[a.category].push(a);
      return acc;
    }, {});
  }, [filtered, activeCategory, query]);

  return (
    <div className="space-y-6">
      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bài viết, tác giả..."
            className="pl-10 rounded-xl h-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "Tất cả" : cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <BookOpenText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Không tìm thấy bài viết</p>
          <p className="mt-1 text-xs text-muted-foreground">Thử từ khóa khác hoặc bỏ bộ lọc</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, arts]) => (
          <section key={cat} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
                {cat === "Kết quả" ? `${filtered.length} kết quả` : cat}
              </h2>
              {cat !== "Kết quả" && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {arts.length}
                </span>
              )}
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {arts.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
