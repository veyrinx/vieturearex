import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Star, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Sheet,
  Skeleton,
  Textarea,
  cx,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/** Đánh giá bài viết: trả lời, thả tim, xoá. */

type Rating = {
  id: string;
  news_id: string;
  rating: number;
  comment: string | null;
  display_name: string | null;
  admin_liked: boolean | null;
  created_at: string;
};

export function RatingsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState<Rating | null>(null);
  const [reply, setReply] = useState("");
  const [removing, setRemoving] = useState<Rating | null>(null);

  const query = useQuery({
    queryKey: ["ratings"],
    queryFn: () => api<{ ratings: Rating[] }>("/api/admin/ratings").then((r) => r.ratings ?? []),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["ratings"] });
  }

  const like = useMutation({
    mutationFn: (input: { id: string; admin_liked: boolean }) =>
      api("/api/admin/ratings", { method: "PATCH", body: input }),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api("/api/admin/ratings", { method: "DELETE", body: { id } }),
    onSuccess: () => {
      setRemoving(null);
      refresh();
      toast.success("Đã xoá đánh giá.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const send = useMutation({
    mutationFn: (input: { rating_id: string; content: string }) =>
      api("/api/admin/ratings/reply", { method: "POST", body: input }),
    onSuccess: () => {
      setReplying(null);
      setReply("");
      refresh();
      toast.success("Đã gửi trả lời.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-4">
      <SubHeader title="Đánh giá bài viết" description="Trả lời và dọn đánh giá xấu" />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Star} title="Chưa có đánh giá nào" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cx(
                        "size-3.5",
                        star <= item.rating ? "fill-warn text-warn" : "text-ink-600",
                      )}
                    />
                  ))}
                </div>
                <span className="truncate text-[13px] text-mist-300">
                  {item.display_name || "Ẩn danh"}
                </span>
                <span className="ml-auto shrink-0 text-[11.5px] text-mist-500">
                  {timeAgo(item.created_at)}
                </span>
              </div>

              {item.comment && (
                <p className="mt-2 text-[13.5px] leading-relaxed text-mist-200">{item.comment}</p>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Heart}
                  onClick={() => like.mutate({ id: item.id, admin_liked: !item.admin_liked })}
                >
                  {item.admin_liked ? "Bỏ tim" : "Thả tim"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={MessageSquare}
                  onClick={() => setReplying(item)}
                >
                  Trả lời
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  className="ml-auto"
                  onClick={() => setRemoving(item)}
                >
                  Xoá
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Trả lời đánh giá"
        footer={
          <Button
            block
            loading={send.isPending}
            onClick={() => {
              if (!replying || !reply.trim()) return;
              send.mutate({ rating_id: replying.id, content: reply.trim() });
            }}
          >
            Gửi
          </Button>
        }
      >
        <Field label="Nội dung trả lời">
          <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
        </Field>
      </Sheet>

      <ConfirmSheet
        open={Boolean(removing)}
        title="Xoá đánh giá?"
        message="Đánh giá và điểm sao sẽ bị gỡ khỏi bài viết."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}
