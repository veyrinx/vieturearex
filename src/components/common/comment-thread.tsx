"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquare, Send, User, Reply, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Comment = {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  parent_id: string | null;
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-teal-600",
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

function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size === "sm" ? 28 : 36}
        height={size === "sm" ? 28 : 36}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", cls)}
      />
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white", avatarColor(name), cls)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ReplyItem({ reply }: { reply: Comment }) {
  return (
    <div className="flex gap-2.5">
      {reply.user_id ? (
        <Link href={`/u/${reply.user_id}`} className="shrink-0 mt-0.5">
          <Avatar name={reply.display_name} src={reply.avatar_url} size="sm" />
        </Link>
      ) : (
        <div className="mt-0.5">
          <Avatar name={reply.display_name} src={reply.avatar_url} size="sm" />
        </div>
      )}
      <div className="min-w-0 flex-1 rounded-xl bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {reply.user_id ? (
            <Link href={`/u/${reply.user_id}`} className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors">
              {reply.display_name}
            </Link>
          ) : (
            <span className="text-[13px] font-semibold text-foreground">{reply.display_name}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">{reply.content}</p>
      </div>
    </div>
  );
}

type CommentItemProps = {
  comment: Comment;
  replies: Comment[];
  userEmail: string | null;
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
    <div className="flex gap-3">
      {/* Avatar column */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {comment.user_id ? (
          <Link href={`/u/${comment.user_id}`}>
            <Avatar name={comment.display_name} src={comment.avatar_url} />
          </Link>
        ) : (
          <Avatar name={comment.display_name} src={comment.avatar_url} />
        )}
        {(repliesOpen && replies.length > 0) && (
          <div className="w-0.5 flex-1 bg-border/60 rounded-full" />
        )}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1 pb-1">
        {/* Bubble */}
        <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
            {comment.user_id ? (
              <Link href={`/u/${comment.user_id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                {comment.display_name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground">{comment.display_name}</span>
            )}
            <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
        </div>

        {/* Action row */}
        <div className="mt-1.5 flex items-center gap-1 pl-1">
          {userEmail && (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold transition-colors",
                replyOpen
                  ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Reply className="size-3.5" />
              Trả lời
            </button>
          )}
          {replies.length > 0 && (
            <button
              type="button"
              onClick={() => setRepliesOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", repliesOpen && "rotate-180")} />
              {replies.length} trả lời
            </button>
          )}
        </div>

        {/* Inline reply form */}
        {replyOpen && (
          <div className="mt-2 space-y-2 pl-1">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Trả lời ${comment.display_name}...`}
              rows={2}
              maxLength={500}
              className="resize-none text-sm rounded-xl"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{replyContent.length}/500</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)} className="h-7 rounded-lg text-xs px-3">
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={submitting || !replyContent.trim()}
                  className="h-7 gap-1.5 rounded-lg text-xs px-3"
                >
                  <Send className="size-3" />
                  {submitting ? "Đang gửi..." : "Gửi"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Replies list */}
        {repliesOpen && replies.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {replies.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type CommentThreadProps = {
  apiPath: string;
  realtimeTable: string;
  realtimeFilter: string;
  realtimeChannel: string;
};

export function CommentThread({ apiPath, realtimeTable, realtimeFilter, realtimeChannel }: CommentThreadProps) {
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
      const res = await fetch(apiPath);
      if (res.ok) {
        const data = (await res.json()) as { comments: Comment[] };
        setComments(data.comments ?? []);
      }
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  }, [apiPath]);

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

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(realtimeChannel)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: realtimeTable,
        filter: realtimeFilter,
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
  }, [realtimeChannel, realtimeTable, realtimeFilter]);

  const submitComment = async (parentId: string | null, text: string) => {
    if (!text.trim() || !userEmail) {
      if (!userEmail) toast.error("Vui lòng đăng nhập để bình luận.");
      return;
    }
    try {
      const res = await fetch(apiPath, {
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

  const label = displayName || userEmail?.split("@")[0] || "";
  const topLevel = comments.filter((c) => c.status === "approved" && !c.parent_id);
  const repliesMap = comments
    .filter((c) => c.status === "approved" && c.parent_id)
    .reduce<Record<string, Comment[]>>((acc, c) => {
      if (c.parent_id) acc[c.parent_id] = [...(acc[c.parent_id] ?? []), c];
      return acc;
    }, {});

  return (
    <section id="comments" className="scroll-mt-24 glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
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

      {/* Compose */}
      {userEmail ? (
        <div className="flex gap-3">
          <div className="shrink-0 mt-1">
            <Avatar name={label} src={avatarUrl} />
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              rows={3}
              maxLength={500}
              className="resize-none text-sm rounded-xl"
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
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <User className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            <a href="/login" className="font-semibold text-primary hover:underline dark:text-amber-400">Đăng nhập</a>
            {" "}để tham gia bình luận.
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 animate-pulse rounded-md bg-muted" />
                <div className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-4">
          {topLevel.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesMap[c.id] ?? []}
              userEmail={userEmail}
              onReplySubmit={async (parentId, text) => { await submitComment(parentId, text); }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
