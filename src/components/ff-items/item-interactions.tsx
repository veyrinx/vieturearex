"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/common/section-heading";
import type { CommentWithAuthor } from "@/lib/types/content";
import type { RatingInfo } from "@/lib/data/ff-data";

type Props = {
  itemId: string;
  initialRatings: RatingInfo;
  initialComments: CommentWithAuthor[];
};

export function ItemInteractions({ itemId, initialRatings, initialComments }: Props) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
      <RatingWidget itemId={itemId} initial={initialRatings} />
      <CommentSection itemId={itemId} initialComments={initialComments} />
    </div>
  );
}

function RatingWidget({ itemId, initial }: { itemId: string; initial: RatingInfo }) {
  const router = useRouter();
  const [hover, setHover] = useState(0);
  const [pending, startTransition] = useTransition();
  const [ratings, setRatings] = useState(initial);

  async function submit(stars: number) {
    try {
      const res = await fetch(`/api/ff-items/${itemId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Không thể gửi đánh giá.");
        return;
      }
      if (json.ratings) setRatings(json.ratings as RatingInfo);
      toast.success("Đã ghi nhận đánh giá của bạn!");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    }
  }

  const active = hover || ratings.user_rating || 0;

  return (
    <div className="h-fit rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-4xl font-black text-foreground">{ratings.average.toFixed(1)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {ratings.count} lượt đánh giá
      </p>
      <div className="mt-4 flex items-center justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onMouseEnter={() => setHover(n)}
            onClick={() => submit(n)}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            aria-label={`Đánh giá ${n} sao`}
          >
            <Star className={cn("size-6", n <= active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {ratings.user_rating ? `Bạn đã đánh giá ${ratings.user_rating} sao` : "Chạm để đánh giá"}
      </p>
    </div>
  );
}

function CommentSection({ itemId, initialComments }: { itemId: string; initialComments: CommentWithAuthor[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (text.length < 2) {
      toast.error("Bình luận quá ngắn.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ff-items/${itemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Không thể gửi bình luận.");
        return;
      }
      if (json.comment) setComments((prev) => [json.comment as CommentWithAuthor, ...prev]);
      setContent("");
      toast.success("Đã gửi bình luận!");
      router.refresh();
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Bình luận" eyebrow="Cộng đồng" align="left" />

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ ý kiến của bạn..."
          maxLength={1000}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Gửi
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                {c.author.avatar_url ? (
                  <Image src={c.author.avatar_url} alt={c.author.display_name ?? "Ẩn danh"} fill className="object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground">
                    {(c.author.display_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{c.author.display_name ?? "Ẩn danh"}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/90">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
