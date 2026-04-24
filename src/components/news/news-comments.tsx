"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, Send, User, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  user_id: string | null;
  display_name: string;
  content: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  parent_id: string | null;
};

type Props = { newsId: string };

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return <Image src={src} alt={name} width={32} height={32} className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border" />;
  }
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", avatarColor(name))}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

type CommentItemProps = {
  comment: Comment;
  replies: Comment[];
  userEmail: string | null;
  avatarUrl: string | null;
  displayName: string;
  onReplySubmit: (parentId: string, content: string) => Promise<void>;
};

function CommentItem({ comment, replies, userEmail, onReplySubmit }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReplySubmit(comment.id, replyContent.trim());
    setReplyContent("");
    setReplyOpen(false);
    setRepliesOpen(true);
    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {comment.user_id ? (
          <Link href={`/u/${comment.user_id}`} className="shrink-0">
            <Avatar name={comment.display_name} />
          </Link>
        ) : (
          <Avatar name={comment.display_name} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {comment.user_id ? (
              <Link href={`/u/${comment.user_id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                {comment.display_name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground">{comment.display_name}</span>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-3">
            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => setRepliesOpen((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline dark:text-amber-400"
              >
                {repliesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                {replies.length} trả lời
              </button>
            )}
            {userEmail && (
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition"
              >
                <CornerDownRight className="size-3" />
                Trả lời
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {repliesOpen && replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-border pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              {reply.user_id ? (
                <Link href={`/u/${reply.user_id}`} className="shrink-0">
                  <Avatar name={reply.display_name} />
                </Link>
              ) : (
                <Avatar name={reply.display_name} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {reply.user_id ? (
                    <Link href={`/u/${reply.user_id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {reply.display_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{reply.display_name}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline reply form */}
      {replyOpen && (
        <div className="ml-11 space-y-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Trả lời ${comment.display_name}...`}
            rows={2}
            maxLength={500}
            className="resize-none text-sm"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{replyContent.length}/500</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setReplyOpen(false)} className="rounded-xl text-xs">
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleReply}
                disabled={submitting || !replyContent.trim()}
                className="gap-1.5 rounded-xl text-xs"
              >
                <Send className="size-3" />
                {submitting ? "Đang gửi..." : "Gửi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NewsComments({ newsId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/news/${newsId}/comments`);
      if (res.ok) {
        const data = (await res.json()) as { comments: Comment[] };
        setComments(data.comments ?? []);
      }
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  }, [newsId]);

  // Auth + profile
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user?.email) return;
      setUserEmail(data.user.email);
      const { data: profile } = await supabase
        .from("users").select("display_name, avatar_url").eq("id", data.user.id).maybeSingle() as
        { data: { display_name: string | null; avatar_url: string | null } | null };
      setDisplayName(profile?.display_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
    });
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Supabase Realtime — new approved comments appear instantly
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`comments:${newsId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "news_comments",
        filter: `news_id=eq.${newsId}`,
      }, (payload) => {
        const incoming = payload.new as Comment;
        if (incoming.status !== "approved") return;
        setComments((prev) => {
          if (prev.some((c) => c.id === incoming.id)) return prev;
          setNewCount((n) => n + 1);
          return [...prev, incoming];
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [newsId]);

  const submitComment = async (parentId: string | null, text: string) => {
    if (!text.trim() || !userEmail) {
      if (!userEmail) toast.error("Vui lòng đăng nhập để bình luận.");
      return;
    }
    try {
      const res = await fetch(`/api/news/${newsId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim(), parent_id: parentId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; pending?: boolean; message?: string };
      if (!res.ok) { toast.error(json.error ?? "Không thể gửi bình luận."); return; }
      if (json.pending) {
        toast.info(json.message ?? "Bình luận đang chờ kiểm duyệt.");
      } else {
        toast.success("Bình luận đã được đăng.");
        await fetchComments();
      }
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    await submitComment(null, content);
    setContent("");
    setSubmitting(false);
  };

  const onReplySubmit = async (parentId: string, text: string) => {
    await submitComment(parentId, text);
  };

  const label = displayName || userEmail?.split("@")[0] || "";
  const topLevel = comments.filter((c) => c.status === "approved" && !c.parent_id);
  const repliesMap = comments
    .filter((c) => c.status === "approved" && c.parent_id)
    .reduce<Record<string, Comment[]>>((acc, c) => {
      if (c.parent_id) {
        acc[c.parent_id] = [...(acc[c.parent_id] ?? []), c];
      }
      return acc;
    }, {});

  return (
    <section id="comments" className="scroll-mt-24 glass-card rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary dark:text-amber-400" />
        <h2 className="font-heading text-base font-bold uppercase tracking-[0.08em] text-foreground">
          Bình luận
          {topLevel.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({topLevel.length})</span>
          )}
        </h2>
        {newCount > 0 && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-500">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
            +{newCount} mới
          </span>
        )}
      </div>

      {userEmail ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={label} src={avatarUrl} />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết bình luận của bạn..."
            rows={3}
            maxLength={500}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/500</span>
            <Button size="sm" onClick={onSubmit} disabled={submitting || !content.trim()} className="gap-1.5 rounded-xl">
              <Send className="size-3.5" />
              {submitting ? "Đang gửi..." : "Gửi bình luận"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Bình luận sẽ được hiển thị sau khi được kiểm duyệt.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <User className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            <a href="/login" className="font-semibold text-primary hover:underline dark:text-amber-400">Đăng nhập</a>
            {" "}để tham gia bình luận.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-5">
          {topLevel.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesMap[c.id] ?? []}
              userEmail={userEmail}
              avatarUrl={avatarUrl}
              displayName={label}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
