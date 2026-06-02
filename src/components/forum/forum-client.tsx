"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Eye, Pin, Lock, Plus, ChevronRight,
  Send, Loader2, AlertCircle, Reply, Clock, Flame, TrendingUp, Trash2,
} from "lucide-react";

export const FORUM_CATEGORIES = [
  "Thảo luận", "Hướng dẫn", "Sự kiện & Giải đấu",
  "Clan & Team", "Free Fire", "Góp ý & Báo lỗi",
];

import { UserAvatar, UserNameWithTitle } from "@/components/common/user-avatar";
import { ForumEditor } from "@/components/forum/forum-editor";
import { ForumContent } from "@/components/forum/forum-content";

type Post = {
  id: string; title: string; category: string;
  display_name: string; avatar_url: string | null;
  css_ring: string | null; user_title: string | null; user_title_color: string | null;
  view_count: number; reply_count: number;
  is_pinned: boolean; is_locked: boolean;
  created_at: string; updated_at: string;
};

type Reply = {
  id: string; user_id: string | null; display_name: string; avatar_url: string | null;
  css_ring: string | null; user_title: string | null; user_title_color: string | null;
  content: string; parent_id: string | null; created_at: string;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

// ─── Forum List ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "latest", label: "Mới nhất", icon: Clock },
  { key: "hot",    label: "Hot",      icon: Flame },
  { key: "views",  label: "Xem nhiều", icon: TrendingUp },
] as const;
type SortKey = "latest" | "hot" | "views";

export function ForumList({ initialPosts, initialTotal }: { initialPosts: Post[]; initialTotal: number }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (cat: string, pg: number, s: SortKey) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), sort: s });
    if (cat !== "all") params.set("category", cat);
    const res = await fetch(`/api/forum?${params}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { posts: Post[]; total: number };
      setPosts(data.posts);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  const changeCategory = (cat: string) => {
    setCategory(cat); setPage(1);
    void load(cat, 1, sort);
  };

  const changeSort = (s: SortKey) => {
    setSort(s); setPage(1);
    void load(category, 1, s);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Category tabs + Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {["all", ...FORUM_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => changeCategory(c)}
              className={[
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                category === c
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              ].join(" ")}
            >
              {c === "all" ? "Tất cả" : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => changeSort(key)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
                sort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}>
              <Icon className="size-3" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className={`space-y-2 transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        {posts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            Chưa có bài viết nào trong danh mục này.
          </div>
        )}
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/cong-dong/${p.id}`}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm md:gap-4"
          >
            <UserAvatar name={p.display_name} url={p.avatar_url} cssRing={p.css_ring} size={9} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                {p.is_pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary dark:text-amber-400"><Pin className="size-2.5" />Ghim</span>}
                {p.is_locked && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"><Lock className="size-2.5" />Đóng</span>}
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{p.category}</span>
              </div>
              <p className="mt-1 font-heading text-sm font-bold text-foreground line-clamp-1 md:text-base">{p.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <UserNameWithTitle name={p.display_name} title={p.user_title} titleColor={p.user_title_color} className="text-[11px]" />
                <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(p.updated_at)}</span>
                <span className="flex items-center gap-1"><Eye className="size-3" />{p.view_count}</span>
                <span className="flex items-center gap-1"><MessageSquare className="size-3" />{p.reply_count}</span>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 mt-1" />
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => { setPage(pg); void load(category, pg, sort); }}
              className={[
                "size-8 rounded-lg text-sm font-semibold transition-colors",
                pg === page ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40",
              ].join(" ")}
            >
              {pg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Post Form ────────────────────────────────────────────────────────
export function ForumPostForm({ onCreated }: { onCreated?: (id: string) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(FORUM_CATEGORIES[0]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading"); setErrMsg("");
    const res = await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category }),
    });
    const data = await res.json() as { id?: string; error?: string };
    if (!res.ok) { setStatus("error"); setErrMsg(data.error ?? "Lỗi không xác định."); return; }
    if (onCreated && data.id) { onCreated(data.id); return; }
    router.push(`/cong-dong/${data.id}`);
  };

  const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none dark:focus:border-amber-400";
  const labelCls = "block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Tiêu đề <span className="text-destructive">*</span></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={200} placeholder="Tiêu đề bài viết của bạn..." className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Danh mục <span className="text-destructive">*</span></label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} appearance-none`}>
          {FORUM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Nội dung <span className="text-destructive">*</span></label>
        <ForumEditor
          value={content}
          onChange={setContent}
          placeholder="Viết nội dung bài đăng... (hỗ trợ in đậm, danh sách, trích dẫn...)"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">{content.replace(/<[^>]*>/g, "").length}/20000 ký tự</p>
      </div>
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {errMsg}
        </div>
      )}
      <button type="submit" disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {status === "loading" ? <><Loader2 className="size-4 animate-spin" />Đang đăng...</> : <><Send className="size-4" />Đăng bài</>}
      </button>
    </form>
  );
}

// ─── Reply Thread ────────────────────────────────────────────────────────────
export function ForumReplies({ postId, isLocked }: { postId: string; isLocked: boolean }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d: { id?: string }) => setCurrentUserId(d.id ?? null)).catch(() => null);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/forum/${postId}/replies`).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { replies: Reply[] };
      setReplies(data.replies);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setErrMsg("");
    const res = await fetch(`/api/forum/${postId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parent_id: replyTo }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) { setErrMsg(data.error ?? "Lỗi"); setSubmitting(false); return; }
    setContent(""); setReplyTo(null);
    await load();
    setSubmitting(false);
  };

  const topLevel = replies.filter((r) => !r.parent_id);
  const childrenOf = (id: string) => replies.filter((r) => r.parent_id === id);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{replies.length} trả lời</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((r) => (
            <div key={r.id} className="space-y-2">
              <ReplyCard r={r} postId={postId} currentUserId={currentUserId}
                onReply={() => setReplyTo(replyTo === r.id ? null : r.id)}
                onDeleted={() => setReplies((prev) => prev.filter((x) => x.id !== r.id))} />
              {childrenOf(r.id).map((child) => (
                <div key={child.id} className="ml-8 border-l-2 border-border pl-4">
                  <ReplyCard r={child} postId={postId} currentUserId={currentUserId}
                    onReply={() => setReplyTo(replyTo === child.id ? null : child.id)}
                    onDeleted={() => setReplies((prev) => prev.filter((x) => x.id !== child.id))} />
                </div>
              ))}
              {replyTo === r.id && (
                <div className="ml-8 border-l-2 border-primary/30 pl-4">
                  <ReplyForm content={content} setContent={setContent} onSubmit={submit} submitting={submitting} errMsg={errMsg} onCancel={() => setReplyTo(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLocked && !replyTo && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Viết trả lời</p>
          <ReplyForm content={content} setContent={setContent} onSubmit={submit} submitting={submitting} errMsg={errMsg} />
        </div>
      )}
      {isLocked && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-4 text-sm text-muted-foreground">
          <Lock className="size-4" /> Bài viết đã được khóa, không thể trả lời.
        </div>
      )}
    </div>
  );
}

function ReplyCard({ r, postId, currentUserId, onReply, onDeleted }: {
  r: Reply; postId: string; currentUserId: string | null;
  onReply: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const isOwn = currentUserId && r.user_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm("Xóa trả lời này?")) return;
    setDeleting(true);
    const res = await fetch(`/api/forum/${postId}/replies/${r.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else setDeleting(false);
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
      <UserAvatar name={r.display_name} url={r.avatar_url} cssRing={r.css_ring} size={8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <UserNameWithTitle name={r.display_name} title={r.user_title} titleColor={r.user_title_color} className="text-sm" />
          <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
        </div>
        <ForumContent content={r.content} className="mt-1.5 text-sm" />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={onReply} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Reply className="size-3" /> Trả lời
          </button>
          {isOwn && (
            <button onClick={handleDelete} disabled={deleting}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
              <Trash2 className="size-3" /> {deleting ? "Đang xóa..." : "Xóa"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyForm({ content, setContent, onSubmit, submitting, errMsg, onCancel }: {
  content: string; setContent: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  submitting: boolean; errMsg: string; onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <ForumEditor
        value={content}
        onChange={setContent}
        placeholder="Viết trả lời của bạn..."
      />
      {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {submitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          Gửi
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Hủy</button>}
      </div>
    </form>
  );
}

// ─── Create Post Button ───────────────────────────────────────────────────────
export function CreatePostButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow hover:opacity-90">
        <Plus className="size-4" /> Tạo bài viết
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">Tạo bài viết mới</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xl font-bold">×</button>
            </div>
            <ForumPostForm onCreated={() => { setOpen(false); window.location.reload(); }} />
          </div>
        </div>
      )}
    </>
  );
}
