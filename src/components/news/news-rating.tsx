"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type LikeRow = { anonymous_id: string; type: string };
type ReplyRow = { id: string; content: string; created_at: string };
type RatingItem = { id: string; anonymous_id: string; stars: number; review: string | null; created_at: string; admin_liked: boolean; likes: LikeRow[]; replies: ReplyRow[] };
type Stats = Record<number, number>;
type Props = { slug: string; title: string };

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"];
const MAX_VISIBLE = 5;

function getOrCreateAnonId(): string {
  try {
    const key = "vt_anon_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const id = "User #" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    localStorage.setItem(key, id);
    return id;
  } catch { return "User #ANON"; }
}

function RatingCard({ r, anonId, onRefresh, isAdmin }: { r: RatingItem; anonId: string; onRefresh: () => void; isAdmin: boolean }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const myLike = r.likes.find((l) => l.anonymous_id === anonId);
  const likeCount = r.likes.filter((l) => l.type === "like").length;
  const unlikeCount = r.likes.filter((l) => l.type === "unlike").length;

  const handleLike = async (type: "like" | "unlike") => {
    if (myLike?.type === type) {
      await fetch("/api/news/ratings/like", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating_id: r.id, anonymous_id: anonId }) });
    } else {
      await fetch("/api/news/ratings/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating_id: r.id, anonymous_id: anonId, type }) });
    }
    onRefresh();
  };

  const handleAdminLike = async () => {
    await fetch("/api/admin/ratings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, admin_liked: !r.admin_liked }) });
    onRefresh();
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const res = await fetch("/api/admin/ratings/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating_id: r.id, content: replyText.trim() }) });
    setSending(false);
    if (!res.ok) { toast.error("Không thể gửi phản hồi."); return; }
    setReplyText("");
    setReplyOpen(false);
    onRefresh();
  };

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 transition-colors ${r.admin_liked ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "border-border bg-background/60"}`}>
      {r.admin_liked && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <span>⭐</span> NỔI BẬT
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{r.anonymous_id}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11} className={i < r.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
          ))}
        </div>
      </div>

      {r.review && <p className="text-sm text-muted-foreground">{r.review}</p>}

      {r.replies.length > 0 && (
        <div className="space-y-1.5 pl-3 border-l-2 border-primary/30">
          {r.replies.map((reply) => (
            <div key={reply.id} className="space-y-0.5">
              <span className="text-xs font-bold text-red-500">ADMIN</span>
              <p className="text-xs text-foreground">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={() => handleLike("like")}
          className={`flex items-center gap-1 text-xs transition-colors ${myLike?.type === "like" ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"}`}>
          <ThumbsUp size={13} /> {likeCount > 0 && likeCount}
        </button>
        <button type="button" onClick={() => handleLike("unlike")}
          className={`flex items-center gap-1 text-xs transition-colors ${myLike?.type === "unlike" ? "text-destructive font-semibold" : "text-muted-foreground hover:text-destructive"}`}>
          <ThumbsDown size={13} /> {unlikeCount > 0 && unlikeCount}
        </button>
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={handleAdminLike}
              className={`text-xs transition-colors ${r.admin_liked ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"}`}
              title={r.admin_liked ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}>
              {r.admin_liked ? "★ Nổi bật" : "☆ Nổi bật"}
            </button>
            <button type="button" onClick={() => setReplyOpen(!replyOpen)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <MessageSquare size={13} /> Trả lời
            </button>
          </div>
        )}
      </div>

      {isAdmin && replyOpen && (
        <div className="flex gap-2 pt-1">
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder="Phản hồi với tư cách Admin..." maxLength={500}
            className="min-h-[60px] resize-none text-xs border-border bg-background" />
          <Button size="icon" onClick={handleReply} disabled={sending || !replyText.trim()} className="shrink-0 self-end">
            <Send size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

export function NewsRating({ slug, title }: Props) {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [stats, setStats] = useState<Stats>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [anonId, setAnonId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setAnonId(getOrCreateAnonId());
    // Kiểm tra admin qua session
    fetch("/api/admin/active-admins").then((r) => {
      setIsAdmin(r.ok);
    }).catch(() => null);
  }, []);

  const fetchRatings = useCallback(async () => {
    const res = await fetch(`/api/news/ratings?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const data = await res.json() as { ratings: RatingItem[]; stats: Stats };
    setRatings(data.ratings);
    setStats(data.stats);
    setLoading(false);
  }, [slug]);

  useEffect(() => { void fetchRatings(); }, [fetchRatings]);

  const totalRatings = Object.values(stats).reduce((a, b) => a + b, 0);
  const avgStars = totalRatings > 0
    ? Object.entries(stats).reduce((sum, [star, count]) => sum + Number(star) * count, 0) / totalRatings
    : 0;

  const visibleRatings = showAll ? ratings : ratings.slice(0, MAX_VISIBLE);

  const onSubmit = async () => {
    if (!selected) { toast.error("Vui lòng chọn số sao."); return; }
    setSubmitting(true);
    const res = await fetch("/api/news/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, anonymous_id: anonId, stars: selected, review }),
    });
    setSubmitting(false);
    if (res.status === 409) { toast.error("Bạn đã đánh giá bài viết này rồi."); return; }
    if (!res.ok) { toast.error("Gửi đánh giá thất bại."); return; }
    setDone(true);
    toast.success("Cảm ơn bạn đã đánh giá!");
    void fetchRatings();
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      {/* Header thống kê */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-heading text-base font-bold uppercase text-foreground">Đánh giá bài viết</p>
          {totalRatings > 0 && (
            <div className="flex items-center gap-1.5">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-foreground">{avgStars.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({totalRatings})</span>
            </div>
          )}
        </div>

        {totalRatings > 0 && (
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[star] ?? 0;
              const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-0.5 w-14 shrink-0">
                    {Array.from({ length: star }).map((_, i) => (
                      <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form đánh giá */}
      {done ? (
        <div className="text-center space-y-1 py-2">
          <p className="text-2xl">⭐</p>
          <p className="font-bold text-foreground text-sm uppercase">Cảm ơn bạn đã đánh giá!</p>
        </div>
      ) : !open ? (
        <Button onClick={() => setOpen(true)} variant="outline" className="rounded-xl w-full">⭐ Viết đánh giá</Button>
      ) : (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button"
                onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(star)} className="transition-transform hover:scale-110">
                <Star size={32} className={`transition-colors ${star <= (hovered || selected) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          {selected > 0 && <p className="text-center text-sm font-medium text-foreground">{STAR_LABELS[selected]}</p>}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Viết đánh giá</label>
            <Textarea value={review} onChange={(e) => setReview(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn..." maxLength={500}
              className="border-border bg-background text-foreground min-h-[80px] resize-none" />
          </div>
          <p className="text-xs text-muted-foreground">Đánh giá với tên: <span className="font-semibold text-foreground">{anonId}</span></p>
          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={submitting || !selected} className="flex-1 rounded-xl">
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Hủy</Button>
          </div>
        </div>
      )}

      {/* Danh sách đánh giá */}
      {!loading && ratings.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Đánh giá ({ratings.length})</p>
          {visibleRatings.map((r) => (
            <RatingCard key={r.id} r={r} anonId={anonId} onRefresh={fetchRatings} isAdmin={isAdmin} />
          ))}
          {ratings.length > MAX_VISIBLE && (
            <button type="button" onClick={() => setShowAll(!showAll)}
              className="w-full text-xs text-primary hover:underline py-1">
              {showAll ? "Thu gọn" : `Xem thêm ${ratings.length - MAX_VISIBLE} đánh giá`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
