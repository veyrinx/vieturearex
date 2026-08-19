"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquare, Eye, Pin, Lock, Plus, ChevronRight,
  Send, Loader2, AlertCircle, Reply, Clock, Flame, TrendingUp, Trash2, ThumbsUp, Pencil, X,
} from "lucide-react";

export const FORUM_CATEGORIES = [
  "Thảo luận", "Hướng dẫn", "Sự kiện & Giải đấu",
  "Clan & Team", "Free Fire", "Góp ý & Báo lỗi",
];

const CATEGORY_META: Record<string, { color: string; border: string; bg: string; dot: string }> = {
  "Thảo luận":          { color: "text-blue-500",    border: "border-l-blue-500/60",    bg: "bg-blue-500/8 dark:bg-blue-500/10",    dot: "bg-blue-500" },
  "Hướng dẫn":          { color: "text-emerald-500", border: "border-l-emerald-500/60", bg: "bg-emerald-500/8 dark:bg-emerald-500/10", dot: "bg-emerald-500" },
  "Sự kiện & Giải đấu": { color: "text-amber-500",   border: "border-l-amber-500/60",   bg: "bg-amber-500/8 dark:bg-amber-500/10",   dot: "bg-amber-500" },
  "Clan & Team":         { color: "text-violet-500",  border: "border-l-violet-500/60",  bg: "bg-violet-500/8 dark:bg-violet-500/10",  dot: "bg-violet-500" },
  "Free Fire":           { color: "text-rose-500",    border: "border-l-rose-500/60",    bg: "bg-rose-500/8 dark:bg-rose-500/10",    dot: "bg-rose-500" },
  "Góp ý & Báo lỗi":    { color: "text-zinc-400",    border: "border-l-zinc-400/60",    bg: "bg-zinc-500/8 dark:bg-zinc-500/10",    dot: "bg-zinc-400" },
};

import { UserAvatar, UserNameWithTitle } from "@/components/common/user-avatar";
import { ForumEditor } from "@/components/forum/forum-editor";
import { ForumContent } from "@/components/forum/forum-content";
import { hasImage, plainTextOf, validateReplyContent } from "@/lib/utils/forum-content";

type Post = {
  id: string; title: string; category: string;
  display_name: string; avatar_url: string | null;
  css_ring: string | null; user_title: string | null; user_title_color: string | null;
  role?: string | null; is_verified?: boolean;
  view_count: number; reply_count: number;
  is_pinned: boolean; is_locked: boolean;
  created_at: string; updated_at: string;
};

type Reply = {
  id: string; user_id: string | null; display_name: string; avatar_url: string | null;
  css_ring: string | null; user_title: string | null; user_title_color: string | null;
  role?: string | null; is_verified?: boolean;
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
          {["all", ...FORUM_CATEGORIES].map((c) => {
            const meta = c !== "all" ? CATEGORY_META[c] : null;
            const isActive = category === c;
            return (
              <button
                key={c}
                onClick={() => changeCategory(c)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm dark:bg-amber-500 dark:text-background"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                ].join(" ")}
              >
                {meta && <span className={`size-1.5 rounded-full ${isActive ? "bg-white/70" : meta.dot}`} />}
                {c === "all" ? "Tất cả" : c}
              </button>
            );
          })}
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
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 motion-safe:animate-[soft-float_3s_ease-in-out_infinite]">
              <MessageSquare className="size-7" />
            </span>
            <p className="text-sm font-semibold text-muted-foreground">Chưa có bài viết nào trong danh mục này.</p>
            <p className="text-xs text-muted-foreground/60">Hãy là người đầu tiên bắt đầu cuộc trò chuyện!</p>
          </div>
        )}
        {posts.map((p) => {
          const catMeta = CATEGORY_META[p.category] ?? { color: "text-muted-foreground", border: "border-l-border", bg: "", dot: "bg-muted-foreground" };
          const isHot = p.reply_count >= 10 || p.view_count >= 200;
          const isNew = (Date.now() - new Date(p.created_at).getTime()) < 86_400_000;
          return (
            <Link
              key={p.id}
              href={`/community/${p.id}`}
              className={`group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 dark:hover:shadow-amber-400/10 border-l-4 ${catMeta.border} md:gap-4`}
            >
              <UserAvatar name={p.display_name} url={p.avatar_url} cssRing={p.css_ring} size={9} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {p.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary dark:text-amber-400">
                      <Pin className="size-2.5" />Ghim
                    </span>
                  )}
                  {p.is_locked && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      <Lock className="size-2.5" />Đóng
                    </span>
                  )}
                  {isHot && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-black text-orange-500">
                      <Flame className="size-2.5" />HOT
                    </span>
                  )}
                  {isNew && !isHot && (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-500">MỚI</span>
                  )}
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${catMeta.color} ${catMeta.bg}`}>{p.category}</span>
                </div>
                <p className="mt-1.5 font-heading text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary dark:group-hover:text-amber-400 transition-colors md:text-base">{p.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <UserNameWithTitle name={p.display_name} title={p.user_title} titleColor={p.user_title_color} role={p.role} isVerified={p.is_verified} className="text-[11px]" />
                  <span className="flex items-center gap-1"><Clock className="size-3" />{timeAgo(p.updated_at)}</span>
                  <span className="flex items-center gap-1"><Eye className="size-3" />{p.view_count.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${p.reply_count > 0 ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                  <MessageSquare className="size-3" />{p.reply_count}
                </span>
              </div>
            </Link>
          );
        })}
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
    // Client-side validation so users get a clear message instead of a generic API error
    const plain = plainTextOf(content);
    if (title.trim().length < 5) { setStatus("error"); setErrMsg("Tiêu đề cần ít nhất 5 ký tự."); return; }
    if (plain.length < 20 && !hasImage(content)) {
      setStatus("error"); setErrMsg("Nội dung cần ít nhất 20 ký tự."); return;
    }

    setStatus("loading"); setErrMsg("");
    const res = await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category }),
    }).catch(() => null);
    if (!res) { setStatus("error"); setErrMsg("Lỗi kết nối. Vui lòng thử lại."); return; }
    const data = await res.json().catch(() => ({})) as { id?: string; error?: string };
    if (res.status === 401) { setStatus("error"); setErrMsg("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."); return; }
    if (res.status === 429) { setStatus("error"); setErrMsg("Bạn đăng quá nhanh, vui lòng đợi một lát."); return; }
    if (!res.ok) { setStatus("error"); setErrMsg(data.error ?? "Lỗi không xác định."); return; }
    if (onCreated && data.id) { onCreated(data.id); return; }
    router.push(`/community/${data.id}`);
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
          placeholder="Viết nội dung bài đăng... (in đậm, danh sách, trích dẫn, chèn ảnh)"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">{plainTextOf(content).length}/20000 ký tự</p>
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
  const [needsLogin, setNeedsLogin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { id?: string } | null) => setCurrentUserId(d?.id ?? null))
      .catch(() => null)
      .finally(() => setAuthChecked(true));
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
    if (submitting) return;

    // Validate locally so an empty editor never produces a confusing API error.
    const invalid = validateReplyContent(content);
    if (invalid) { setErrMsg(invalid); setNeedsLogin(false); return; }

    setSubmitting(true); setErrMsg(""); setNeedsLogin(false);
    try {
      const res = await fetch(`/api/forum/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: replyTo }),
      });
      // A 429/500 can come back as HTML, so never let res.json() throw.
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (res.status === 401) {
        setNeedsLogin(true);
        setErrMsg("Bạn cần đăng nhập để bình luận.");
        return;
      }
      if (res.status === 429) {
        setErrMsg("Bạn gửi quá nhanh, vui lòng đợi một lát rồi thử lại.");
        return;
      }
      if (!res.ok) { setErrMsg(data.error ?? "Không gửi được, vui lòng thử lại."); return; }
      setContent(""); setReplyTo(null);
      await load();
    } catch {
      setErrMsg("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      // Always released — previously a thrown fetch/json left the button spinning.
      setSubmitting(false);
    }
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
                onDeleted={() => setReplies((prev) => prev.filter((x) => x.id !== r.id))}
                onEdited={(c) => setReplies((prev) => prev.map((x) => x.id === r.id ? { ...x, content: c } : x))} />
              {childrenOf(r.id).map((child) => (
                <div key={child.id} className="ml-8 border-l-2 border-border pl-4">
                  <ReplyCard r={child} postId={postId} currentUserId={currentUserId}
                    onReply={() => setReplyTo(replyTo === child.id ? null : child.id)}
                    onDeleted={() => setReplies((prev) => prev.filter((x) => x.id !== child.id))}
                    onEdited={(c) => setReplies((prev) => prev.map((x) => x.id === child.id ? { ...x, content: c } : x))} />
                </div>
              ))}
              {replyTo === r.id && (
                <div className="ml-8 border-l-2 border-primary/30 pl-4">
                  <ReplyForm content={content} setContent={setContent} onSubmit={submit} submitting={submitting} errMsg={errMsg} needsLogin={needsLogin} onCancel={() => setReplyTo(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLocked && !replyTo && authChecked && !currentUserId && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <MessageSquare className="size-5 text-primary dark:text-amber-400" />
          </span>
          <p className="text-sm text-muted-foreground">Đăng nhập để tham gia bình luận và đính kèm ảnh.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/community/${postId}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {!isLocked && !replyTo && (!authChecked || currentUserId) && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Viết trả lời</p>
          <ReplyForm content={content} setContent={setContent} onSubmit={submit} submitting={submitting} errMsg={errMsg} needsLogin={needsLogin} />
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

function ReplyCard({ r, postId, currentUserId, onReply, onDeleted, onEdited }: {
  r: Reply; postId: string; currentUserId: string | null;
  onReply: () => void; onDeleted: () => void;
  onEdited: (newContent: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(r.content);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const isOwn = currentUserId && r.user_id === currentUserId;

  const handleDelete = async () => {
    if (!confirm("Xóa trả lời này?")) return;
    setDeleting(true);
    const res = await fetch(`/api/forum/${postId}/replies/${r.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) onDeleted();
    else setDeleting(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateReplyContent(editContent);
    if (invalid) { setEditErr(invalid); return; }

    setSaving(true); setEditErr("");
    try {
      const res = await fetch(`/api/forum/${postId}/replies/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setEditErr(data.error ?? "Không lưu được, vui lòng thử lại."); return; }
      onEdited(editContent);
      setEditing(false);
    } catch {
      setEditErr("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
      <UserAvatar name={r.display_name} url={r.avatar_url} cssRing={r.css_ring} size={8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <UserNameWithTitle name={r.display_name} title={r.user_title} titleColor={r.user_title_color} role={r.role} isVerified={r.is_verified} className="text-sm" />
          <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
        </div>
        {editing ? (
          <form onSubmit={handleSaveEdit} className="mt-2 space-y-2">
            <ForumEditor value={editContent} onChange={setEditContent} placeholder="Chỉnh sửa trả lời..." />
            {editErr && <p className="text-xs text-destructive">{editErr}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Lưu
              </button>
              <button type="button" onClick={() => { setEditing(false); setEditContent(r.content); }}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Hủy</button>
            </div>
          </form>
        ) : (
          <ForumContent content={r.content} className="mt-1.5 text-sm" />
        )}
        {!editing && (
          <div className="mt-2 flex items-center gap-3">
            <button onClick={onReply} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
              <Reply className="size-3" /> Trả lời
            </button>
            {isOwn && (
              <>
                <button onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="size-3" /> Sửa
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                  <Trash2 className="size-3" /> {deleting ? "Đang xóa..." : "Xóa"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpful Button ───────────────────────────────────────────────────────────
// Trạng thái phiếu nằm ở server (bảng forum_post_votes). Bản cũ chỉ nhớ trong
// localStorage nên xoá đi là bấm lại được vô hạn.
export function ForumHelpfulButton({ postId, initialCount }: { postId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/forum/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "helpful-state" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { helpful_count?: number; voted?: boolean } | null) => {
        if (!alive || !d) return;
        if (typeof d.helpful_count === "number") setCount(d.helpful_count);
        setVoted(Boolean(d.voted));
      })
      .catch(() => { /* im lặng — nút vẫn bấm được, server chốt lần cuối */ });
    return () => { alive = false; };
  }, [postId]);

  const handleVote = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "helpful" }),
      });
      const data = await res.json().catch(() => null) as
        { helpful_count?: number; voted?: boolean; error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "Không ghi được phiếu.");
        return;
      }
      if (typeof data?.helpful_count === "number") setCount(data.helpful_count);
      setVoted(Boolean(data?.voted));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={[
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60",
        voted
          ? "border-primary/30 bg-primary/10 text-primary dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400",
      ].join(" ")}
      title={voted ? "Bấm lần nữa để bỏ phiếu" : undefined}
    >
      <ThumbsUp className={`size-4 ${voted ? "fill-current" : ""}`} />
      {voted ? "Đã vote hữu ích" : "Hữu ích"}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function ReplyForm({ content, setContent, onSubmit, submitting, errMsg, needsLogin, onCancel }: {
  content: string; setContent: (v: string) => void; onSubmit: (e: React.FormEvent) => void;
  submitting: boolean; errMsg: string; needsLogin?: boolean; onCancel?: () => void;
}) {
  const pathname = usePathname();

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <ForumEditor
        value={content}
        onChange={setContent}
        placeholder="Viết trả lời của bạn... (có thể dán hoặc kéo thả ảnh vào đây)"
      />
      {errMsg && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errMsg}</span>
          {needsLogin && (
            <Link
              href={`/login?next=${encodeURIComponent(pathname || "/community")}`}
              className="font-bold underline underline-offset-2"
            >
              Đăng nhập ngay
            </Link>
          )}
        </div>
      )}
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

// ─── Post Edit Button ─────────────────────────────────────────────────────────
export function ForumPostEditButton({
  postId, initialTitle, initialContent, postUserId,
  onSaved,
}: {
  postId: string; initialTitle: string; initialContent: string;
  postUserId: string | null;
  // Optional — a Server Component parent cannot pass a function across the
  // server/client boundary, so this component refreshes on save by itself.
  onSaved?: (title: string, content: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d: { id?: string }) => setCurrentUserId(d.id ?? null)).catch(() => null);
  }, []);

  if (!currentUserId || currentUserId !== postUserId) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/forum/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content }),
    });
    if (res.ok) { onSaved?.(title.trim(), content); setEditing(false); router.refresh(); }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="border-t border-border px-5 py-4 md:px-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
            <Pencil className="size-3.5" /> Chỉnh sửa bài viết
          </p>
          <button onClick={() => { setEditing(false); setTitle(initialTitle); setContent(initialContent); }}
            className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <ForumEditor value={content} onChange={setContent} placeholder="Nội dung bài viết..." />
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setTitle(initialTitle); setContent(initialContent); }}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Hủy</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors dark:hover:text-amber-400">
      <Pencil className="size-3.5" /> Sửa bài
    </button>
  );
}

// ─── Create Post Button ───────────────────────────────────────────────────────
export function CreatePostButton() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { id?: string } | null) => setAuthed(Boolean(d?.id)))
      .catch(() => setAuthed(false));
  }, []);

  const loggedOut = authed === false;

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow hover:opacity-90">
        <Plus className="size-4" /> Tạo bài viết
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">
                {loggedOut ? "Đăng nhập để đăng bài" : "Tạo bài viết mới"}
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xl font-bold">×</button>
            </div>
            {loggedOut ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
                  <MessageSquare className="size-6 text-primary dark:text-amber-400" />
                </span>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Bạn cần tham gia cộng đồng để tạo bài viết, thảo luận và tích điểm.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent("/community")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  Tham Gia Ngay
                </Link>
              </div>
            ) : (
              <ForumPostForm onCreated={() => { setOpen(false); window.location.reload(); }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
