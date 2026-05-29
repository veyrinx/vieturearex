"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Clock, ArrowRight, MessageSquare, Pencil, Trash2, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { MediaFrame } from "@/components/common/media-frame";
import { NewsEditorDialog } from "@/components/admin/news-editor-dialog";
import { Button } from "@/components/ui/button";
import type { NewsItem } from "@/lib/types/content";
import { useAdminRole } from "@/hooks/use-admin-role";
import { AdminOnlineBadge } from "@/components/home/admin-online-badge";

type LatestNewsProps = {
  news: NewsItem[];
};

type CardAdminProps = {
  canEdit: boolean;
  onEdit: (item: NewsItem) => void;
  onDelete: (item: NewsItem) => void;
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return null;
  }
}

function FeaturedCard({ item, canEdit, onEdit, onDelete }: { item: NewsItem } & CardAdminProps) {
  const ago = timeAgo(item.created_at);
  return (
    <Reveal>
      <article className="group relative flex flex-col overflow-hidden rounded-[18px] border bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 dark:border-border dark:bg-card">
        <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
        <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
        {canEdit && (
          <div className="absolute right-2 top-2 z-50 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
              className="flex size-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-primary/90" title="Chỉnh sửa">
              <Pencil className="size-3.5" />
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item); }}
              className="flex size-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition hover:bg-destructive/90" title="Xóa">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
        <div className="relative overflow-hidden rounded-[18px]">
          <MediaFrame
            src={item.cover}
            alt={item.title}
            sizes="(max-width: 768px) 100vw, 60vw"
            aspectClassName="aspect-[21/9]"
            imageClassName="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent" />
          {item.category && (
            <span className="absolute left-3 top-3 z-30 rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-lg">
              {item.category}
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-30">
            <h3 className="font-heading text-xl font-bold uppercase tracking-[0.04em] text-white line-clamp-2 drop-shadow-lg md:text-2xl">
              {item.title}
            </h3>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {ago && (
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <Clock className="size-3 shrink-0" />
                    <span className="font-medium">{ago}</span>
                  </div>
                )}
                {item.created_by_name && (
                  <div className="flex items-center gap-1 text-[11px] text-white/60">
                    <User className="size-3 shrink-0" />
                    <span>{item.created_by_name}</span>
                  </div>
                )}
              </div>
              <Link
                href={`/news/${item.slug}#comments`}
                onClick={(e) => e.stopPropagation()}
                className="relative z-50 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <MessageSquare className="size-3 shrink-0" />
                Bình luận
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function MiniCard({ item, index, canEdit, onEdit, onDelete }: { item: NewsItem; index: number } & CardAdminProps) {
  const ago = timeAgo(item.created_at);
  const author = item.created_by_name;
  return (
    <Reveal delay={index * 0.07}>
      <article className="group relative flex gap-3 overflow-hidden rounded-[12px] border bg-white p-3 transition-all duration-200 hover:shadow-md hover:border-primary/30 dark:border-border dark:bg-card dark:hover:border-amber-400/30">
        <div className="grid-sheen pointer-events-none absolute inset-y-0 left-0 z-20" />
        <Link href={`/news/${item.slug}`} className="absolute inset-0 z-40" aria-label={item.title} />
        {canEdit && (
          <div className="absolute right-2 top-2 z-50 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
              className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition hover:bg-primary/90" title="Chỉnh sửa">
              <Pencil className="size-3" />
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item); }}
              className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition hover:bg-destructive/90" title="Xóa">
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
        <div className="relative w-24 shrink-0 overflow-hidden rounded-[8px] md:w-28">
          <MediaFrame
            src={item.cover}
            alt={item.title}
            sizes="128px"
            aspectClassName="aspect-[4/3]"
            imageClassName="object-cover transition duration-300 group-hover:scale-105"
          />
          {item.category && (
            <span className="absolute left-1 top-1 z-30 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <h3 className="font-heading text-[0.85rem] font-bold uppercase tracking-[0.03em] text-foreground line-clamp-2 transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
            {item.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {ago && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="size-3 shrink-0" />
                  <span className="font-medium">{ago}</span>
                </div>
              )}
              {author && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <User className="size-2.5 shrink-0" />
                  <span>{author}</span>
                </div>
              )}
            </div>
            <Link
              href={`/news/${item.slug}#comments`}
              onClick={(e) => e.stopPropagation()}
              className="relative z-50 inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
            >
              <MessageSquare className="size-3" />
              BL
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-primary/0 transition-all duration-200 group-hover:bg-primary/60 dark:group-hover:bg-amber-400/60" />
      </article>
    </Reveal>
  );
}

export function LatestNews({ news }: LatestNewsProps) {
  const [localNews, setLocalNews] = useState<NewsItem[]>(news);
  const [editTarget, setEditTarget] = useState<NewsItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { canEdit } = useAdminRole();

  const featured = localNews[0];
  const rest = localNews.slice(1, 6);

  const handleDelete = async (item: NewsItem) => {
    if (!confirm(`Xóa bài viết "${item.title}"?`)) return;
    const res = await fetch("/api/admin/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (res.ok) {
      setLocalNews((prev) => prev.filter((n) => n.id !== item.id));
      toast.success("Đã xóa bài viết.");
    } else {
      toast.error("Không thể xóa.");
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditTarget(item);
    setEditOpen(true);
  };

  const handleSaved = async () => {
    const res = await fetch("/api/news");
    if (res.ok) {
      const data = await res.json() as { news?: NewsItem[] };
      if (data.news) setLocalNews(data.news);
    }
    setEditOpen(false);
    setCreateOpen(false);
  };

  const adminProps: CardAdminProps = { canEdit, onEdit: handleEdit, onDelete: handleDelete };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Tin tức"
          title="TIN TỨC MỚI NHẤT"
          description="Bài viết mới nhất được cập nhật theo chuyên mục"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AdminOnlineBadge />
          {canEdit && (
            <Button size="sm" onClick={() => { setEditTarget(null); setCreateOpen(true); }} className="h-8 gap-1.5 rounded-xl text-xs">
              <Plus className="size-3.5" />
              Thêm tin tức
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
            <Link href="/news">
              Xem tất cả
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {localNews.length === 0 ? (
        <div className="rounded-[14px] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có bài viết nào.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          {featured && <FeaturedCard item={featured} {...adminProps} />}
          {rest.length > 0 && (
            <div className="flex flex-col gap-3">
              {rest.map((item, i) => (
                <MiniCard key={item.id} item={item} index={i + 1} {...adminProps} />
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <NewsEditorDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            initialData={editTarget}
            showTrigger={false}
            onSaved={handleSaved}
          />
          <NewsEditorDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            initialData={null}
            showTrigger={false}
            onSaved={handleSaved}
          />
        </>
      )}
    </section>
  );
}
