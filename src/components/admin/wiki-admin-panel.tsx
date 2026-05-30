"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, Eye, EyeOff, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { cn } from "@/lib/utils";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  author_name: string;
  view_count: number;
  edit_count: number;
  created_at: string;
  updated_at: string;
};

const STATUS_CLS: Record<string, string> = {
  published: "bg-green-500/10 text-green-600 border-green-500/20",
  draft:     "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export function WikiAdminPanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/wiki")
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (article: Article) => {
    const next = article.status === "published" ? "draft" : "published";
    setActionId(article.slug);
    const res = await fetch("/api/admin/wiki", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: article.slug, status: next }),
    });
    setActionId(null);
    if (res.ok) {
      setArticles((prev) => prev.map((a) => a.slug === article.slug ? { ...a, status: next } : a));
      toast.success(next === "published" ? "Đã xuất bản" : "Đã ẩn bài viết");
    } else {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const deleteArticle = async (slug: string) => {
    const res = await fetch("/api/admin/wiki", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
      toast.success("Đã xóa bài wiki");
    } else {
      toast.error("Không thể xóa");
    }
  };

  const filtered = articles.filter((a) => {
    const matchQ = !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.author_name.toLowerCase().includes(q.toLowerCase());
    const matchS = statusFilter === "all" || a.status === statusFilter;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
          Quản Lý Wiki
        </h1>
        <p className="text-sm text-muted-foreground">
          {articles.length} bài viết — duyệt, ẩn, hoặc xóa nội dung wiki cộng đồng.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài viết, tác giả..." className="pl-9 h-9 text-sm" />
        </div>
        {["all", "published", "draft"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {s === "all" ? "Tất cả" : s === "published" ? "Xuất bản" : "Ẩn"}
            {" "}
            <span className="ml-1 opacity-60">
              ({s === "all" ? articles.length : articles.filter((a) => a.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Bài viết</th>
                <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground sm:table-cell">Danh mục</th>
                <th className="hidden px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground md:table-cell">Tác giả</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Trạng thái</th>
                <th className="hidden px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground lg:table-cell">Lượt xem</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    <BookOpen className="mx-auto mb-2 size-8 opacity-30" />
                    Không có bài viết nào
                  </td>
                </tr>
              ) : filtered.map((article) => (
                <tr key={article.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground line-clamp-1">{article.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(article.updated_at).toLocaleDateString("vi-VN")}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold">
                      {article.category}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {article.author_name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", STATUS_CLS[article.status] ?? STATUS_CLS.draft)}>
                      {article.status === "published" ? "Xuất bản" : "Ẩn"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground lg:table-cell">
                    {article.view_count.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/wiki/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Xem bài viết"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void toggleStatus(article)}
                        disabled={actionId === article.slug}
                        title={article.status === "published" ? "Ẩn bài viết" : "Xuất bản"}
                        className="size-8 text-muted-foreground hover:text-amber-500"
                      >
                        {actionId === article.slug
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : article.status === "published"
                            ? <EyeOff className="size-3.5" />
                            : <Eye className="size-3.5" />}
                      </Button>
                      <ConfirmDeleteDialog
                        itemName={article.title}
                        itemType="bài wiki"
                        description="Bài viết sẽ bị xóa vĩnh viễn, không thể khôi phục."
                        onConfirm={() => deleteArticle(article.slug)}
                        trigger={
                          <Button size="icon" variant="ghost" title="Xóa" className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
