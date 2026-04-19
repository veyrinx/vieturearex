"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  display_name: string;
  content: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
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

export function NewsComments({ newsId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user?.email) {
          setUserEmail(data.user.email);
          const { data: profile } = await supabase
            .from("users")
            .select("display_name")
            .eq("id", data.user.id)
            .maybeSingle() as { data: { display_name: string | null } | null };
          setDisplayName(profile?.display_name ?? null);
        }
      });
    }
    fetchComments();
  }, [newsId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/news/${newsId}/comments`);
      if (res.ok) {
        const data = (await res.json()) as { comments: Comment[] };
        setComments(data.comments ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!content.trim()) return;
    if (!userEmail) {
      toast.error("Vui lòng đăng nhập để bình luận.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể gửi bình luận.");
        return;
      }
      toast.success("Bình luận đã được gửi và đang chờ duyệt.");
      setContent("");
      await fetchComments();
    } catch {
      toast.error("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const label = displayName || userEmail?.split("@")[0] || "";
  const approved = comments.filter((c) => c.status === "approved");

  return (
    <section id="comments" className="scroll-mt-24 glass-card rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary dark:text-amber-400" />
        <h2 className="font-heading text-base font-bold uppercase tracking-[0.08em] text-foreground">
          Bình luận
          {approved.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({approved.length})</span>
          )}
        </h2>
      </div>

      {/* Submit form */}
      {userEmail ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", avatarColor(label))}>
              {label.charAt(0).toUpperCase()}
            </div>
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
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting || !content.trim()}
              className="gap-1.5 rounded-xl"
            >
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

      {/* Comments list */}
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
      ) : approved.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <div className="space-y-4">
          {approved.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", avatarColor(c.display_name))}>
                {c.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">{c.display_name}</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
