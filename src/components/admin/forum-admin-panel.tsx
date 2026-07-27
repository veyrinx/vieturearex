"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, RefreshCw, Search, Pin, PinOff, Lock, Unlock,
  EyeOff, Eye, MessageSquare, FileText, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type ForumPost = {
  id: string;
  title: string;
  category: string;
  user_id: string | null;
  display_name: string;
  view_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  status: "active" | "removed";
  created_at: string;
};

type ForumReply = {
  id: string;
  post_id: string;
  user_id: string | null;
  display_name: string;
  content: string;
  status: "active" | "removed";
  created_at: string;
};

type ViewType = "posts" | "replies";
type StatusFilter = "all" | "active" | "removed";

const STATUS_META: Record<StatusFilter, { label: string }> = {
  all:     { label: "Tất cả" },
  active:  { label: "Hoạt động" },
  removed: { label: "Đã ẩn" },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

async function fetchItems(type: ViewType, status: StatusFilter) {
  const res = await fetch(`/api/admin/forum?type=${type}&status=${status}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json() as { items: (ForumPost | ForumReply)[] };
  return data.items ?? [];
}

async function patchItem(id: string, itemType: "post" | "reply", action: string, value?: boolean) {
  const res = await fetch("/api/admin/forum", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, type: itemType === "reply" ? "reply" : "post", action, value }),
  });
  if (!res.ok) throw new Error("Failed");
}

async function deleteItem(id: string, itemType: "post" | "reply") {
  const res = await fetch("/api/admin/forum", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, type: itemType === "reply" ? "reply" : "post" }),
  });
  if (!res.ok) throw new Error("Failed");
}

export function ForumAdminPanel() {
  const queryClient = useQueryClient();
  const [viewType, setViewType] = useState<ViewType>("posts");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-forum", viewType, statusFilter],
    queryFn: () => fetchItems(viewType, statusFilter),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-forum"] });

  const handlePatch = async (id: string, itemType: "post" | "reply", action: string, value?: boolean) => {
    try {
      await patchItem(id, itemType, action, value);
      toast.success("Cập nhật thành công");
      await invalidate();
    } catch {
      toast.error("Không thể cập nhật");
    }
  };

  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : "";

  const posts = viewType === "posts" ? items as ForumPost[] : [];
  const replies = viewType === "replies" ? items as ForumReply[] : [];

  const filteredPosts = posts.filter((p) =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.display_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredReplies = replies.filter((r) =>
    !search ||
    r.content.toLowerCase().includes(search.toLowerCase()) ||
    r.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {(["posts", "replies"] as ViewType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setViewType(t); setSearch(""); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                viewType === t
                  ? "bg-primary text-primary-foreground dark:bg-amber-500 dark:text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "posts" ? <FileText className="size-3.5" /> : <MessageSquare className="size-3.5" />}
              {t === "posts" ? "Bài viết" : "Trả lời"}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(["all", "active", "removed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                statusFilter === s
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="h-8 w-48 pl-8 text-xs"
          />
        </div>

        <Button variant="outline" size="sm" onClick={invalidate} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="size-3.5" /> Làm mới
        </Button>
      </div>

      {isLoading && <LoadingSpinner className="py-12" label="ĐANG TẢI..." />}

      {/* Posts */}
      {!isLoading && viewType === "posts" && (
        filteredPosts.length === 0 ? (
          <EmptyState title="KHÔNG CÓ BÀI VIẾT" description="Không tìm thấy bài viết phù hợp." />
        ) : (
          <div className="space-y-2">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:gap-4",
                  post.status === "removed" && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {post.category}
                    </span>
                    {post.is_pinned && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">📌 Ghim</span>
                    )}
                    {post.is_locked && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">🔒 Khóa</span>
                    )}
                    {post.status === "removed" && (
                      <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">Đã ẩn</span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{post.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">{post.display_name}</span>
                    {" · "}{timeAgo(post.created_at)}
                    {" · "}{post.view_count} lượt xem
                    {" · "}{post.reply_count} trả lời
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <a
                    href={`${siteUrl}/community/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
                    title="Xem bài viết"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>

                  <button
                    onClick={() => handlePatch(post.id, "post", "pin", !post.is_pinned)}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
                    title={post.is_pinned ? "Bỏ ghim" : "Ghim bài"}
                  >
                    {post.is_pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>

                  <button
                    onClick={() => handlePatch(post.id, "post", "lock", !post.is_locked)}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
                    title={post.is_locked ? "Mở khóa" : "Khóa bình luận"}
                  >
                    {post.is_locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                  </button>

                  {post.status === "active" ? (
                    <button
                      onClick={() => handlePatch(post.id, "post", "remove")}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-amber-500 transition hover:bg-amber-500/10"
                      title="Ẩn bài viết"
                    >
                      <EyeOff className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePatch(post.id, "post", "restore")}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-green-500 transition hover:bg-green-500/10"
                      title="Khôi phục"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}

                  <ConfirmDeleteDialog
                    itemName={`bài viết "${post.title.slice(0, 40)}"`}
                    itemType="bài viết diễn đàn"
                    description="Bài viết và toàn bộ trả lời sẽ bị xóa vĩnh viễn."
                    onConfirm={() => deleteItem(post.id, "post").then(invalidate)}
                    trigger={
                      <Button size="sm" variant="ghost" className="size-7 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Replies */}
      {!isLoading && viewType === "replies" && (
        filteredReplies.length === 0 ? (
          <EmptyState title="KHÔNG CÓ TRẢ LỜI" description="Không tìm thấy trả lời phù hợp." />
        ) : (
          <div className="space-y-2">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:gap-4",
                  reply.status === "removed" && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {reply.status === "removed" && (
                    <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">Đã ẩn</span>
                  )}
                  <p className="line-clamp-3 text-sm text-foreground/90">{reply.content}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">{reply.display_name}</span>
                    {" · "}{timeAgo(reply.created_at)}
                    {" · "}
                    <a
                      href={`${siteUrl}/community/${reply.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:underline"
                    >
                      xem bài gốc ↗
                    </a>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {reply.status === "active" ? (
                    <button
                      onClick={() => handlePatch(reply.id, "reply", "remove")}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-amber-500 transition hover:bg-amber-500/10"
                      title="Ẩn trả lời"
                    >
                      <EyeOff className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePatch(reply.id, "reply", "restore")}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-border text-green-500 transition hover:bg-green-500/10"
                      title="Khôi phục"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}

                  <ConfirmDeleteDialog
                    itemName={`trả lời của ${reply.display_name}`}
                    itemType="trả lời"
                    description="Trả lời sẽ bị xóa vĩnh viễn."
                    onConfirm={() => deleteItem(reply.id, "reply").then(invalidate)}
                    trigger={
                      <Button size="sm" variant="ghost" className="size-7 rounded-lg p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
