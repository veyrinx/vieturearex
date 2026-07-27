"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpenText, Loader2 } from "lucide-react";
import { WikiEditor } from "@/components/wiki/wiki-editor";

type WikiArticle = {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  cover_url?: string;
  user_id?: string;
};

export default function WikiEditPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/wiki/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Không tìm thấy bài viết hoặc bạn không có quyền chỉnh sửa.");
        return r.json();
      })
      .then((data: { article?: WikiArticle }) => { setArticle(data.article ?? null); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Đang tải bài viết...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-4xl py-12 space-y-4">
        <Link href="/wiki"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-emerald-500/40 hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" /> Quay lại Wiki
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-8 text-center">
          <p className="font-semibold text-foreground">{error ?? "Không tìm thấy bài viết"}</p>
          <Link href="/wiki" className="mt-3 inline-block text-xs text-primary hover:underline dark:text-amber-400">
            Về trang Wiki →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-6">
      {/* Back */}
      <Link href={`/wiki/${slug}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-emerald-500/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> {article.title}
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
            <BookOpenText className="size-6 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Arex Wiki</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground">Chỉnh Sửa Bài Wiki</h1>
            <p className="text-sm text-muted-foreground line-clamp-1">{article.title}</p>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <WikiEditor
          initialData={{
            slug: article.slug,
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            category: article.category,
            cover_url: article.cover_url,
          }}
          onSuccess={(savedSlug) => router.push(`/wiki/${savedSlug}`)}
        />
      </div>
    </div>
  );
}
