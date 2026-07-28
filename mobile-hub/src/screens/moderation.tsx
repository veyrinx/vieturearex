import { useState } from "react";
import {
  CheckCheck,
  Check,
  Lock,
  LockOpen,
  MessageSquare,
  MessagesSquare,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  Segmented,
  Skeleton,
} from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import {
  useComments,
  useDeleteComment,
  useDeleteForumItem,
  useForum,
  useModerateComments,
  useModerateForum,
  type ForumAction,
} from "@/lib/queries";
import { stripHtml, timeAgo, truncate } from "@/lib/format";
import type { CommentStatus, CommentTable, ForumKind } from "@/types";

type Area = "comments" | "forum";

export function ModerationScreen() {
  const [area, setArea] = useState<Area>("comments");

  return (
    <div className="space-y-4">
      <Segmented
        value={area}
        onChange={setArea}
        options={[
          { value: "comments", label: "Bình luận" },
          { value: "forum", label: "Diễn đàn" },
        ]}
      />
      {area === "comments" ? <CommentsPanel /> : <ForumPanel />}
    </div>
  );
}

// ── Bình luận ───────────────────────────────────────────────────────────────

const COMMENT_STATUS: { value: CommentStatus | "all"; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "all", label: "Tất cả" },
];

function CommentsPanel() {
  const toast = useToast();
  const [table, setTable] = useState<CommentTable>("news_comments");
  const [status, setStatus] = useState<CommentStatus | "all">("pending");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const comments = useComments(table, status);
  const moderate = useModerateComments();
  const remove = useDeleteComment();

  async function setStatusFor(ids: string[], next: CommentStatus) {
    try {
      await moderate.mutateAsync({ ids, status: next, table });
      toast.success(
        next === "approved"
          ? `Đã duyệt ${ids.length} bình luận.`
          : `Đã từ chối ${ids.length} bình luận.`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync({ id: pendingDelete, table });
      toast.success("Đã xoá bình luận.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const items = comments.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={table}
        onChange={setTable}
        options={[
          { value: "news_comments", label: "Bài viết" },
          { value: "event_comments", label: "Sự kiện" },
        ]}
      />
      <Segmented value={status} onChange={setStatus} options={COMMENT_STATUS} />

      {status === "pending" && items.length > 1 && (
        <Button
          variant="secondary"
          block
          icon={CheckCheck}
          loading={moderate.isPending}
          onClick={() => void setStatusFor(items.map((item) => item.id), "approved")}
        >
          Duyệt tất cả ({items.length})
        </Button>
      )}

      {comments.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState
          message={errorMessage(comments.error)}
          onRetry={() => void comments.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Không có bình luận"
          description={
            status === "pending" ? "Không còn gì chờ duyệt — gọn gàng." : "Chưa có dữ liệu ở mục này."
          }
        />
      ) : (
        items.map((item) => (
          <Card key={item.id} className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium">
                  {item.display_name || "Ẩn danh"}
                </p>
                <p className="text-[11.5px] text-mist-500">{timeAgo(item.created_at)}</p>
              </div>
              <Chip
                tone={
                  item.status === "approved" ? "ok" : item.status === "rejected" ? "danger" : "warn"
                }
              >
                {item.status === "approved"
                  ? "Đã duyệt"
                  : item.status === "rejected"
                    ? "Từ chối"
                    : "Chờ duyệt"}
              </Chip>
            </div>

            <p className="text-[13.5px] leading-relaxed text-mist-300">
              {truncate(stripHtml(item.content), 240)}
            </p>

            <div className="flex gap-2 border-t border-ink-800 pt-2.5">
              {item.status !== "approved" && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Check}
                  loading={moderate.isPending}
                  onClick={() => void setStatusFor([item.id], "approved")}
                >
                  Duyệt
                </Button>
              )}
              {item.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={X}
                  loading={moderate.isPending}
                  onClick={() => void setStatusFor([item.id], "rejected")}
                >
                  Từ chối
                </Button>
              )}
              <IconButton
                icon={Trash2}
                label="Xoá bình luận"
                tone="danger"
                className="ml-auto"
                onClick={() => setPendingDelete(item.id)}
              />
            </div>
          </Card>
        ))
      )}

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Xoá bình luận?"
        message="Bình luận sẽ biến mất khỏi website và không khôi phục được."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ── Diễn đàn ────────────────────────────────────────────────────────────────

function ForumPanel() {
  const toast = useToast();
  const [kind, setKind] = useState<ForumKind>("posts");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const forum = useForum(kind, status);
  const moderate = useModerateForum();
  const remove = useDeleteForumItem();

  const type = kind === "posts" ? "post" : "reply";

  async function act(id: string, action: ForumAction, value?: boolean) {
    try {
      await moderate.mutateAsync({ id, type, action, value });
      const labels: Record<ForumAction, string> = {
        pin: value ? "Đã ghim." : "Đã bỏ ghim.",
        lock: value ? "Đã khoá." : "Đã mở khoá.",
        remove: "Đã ẩn khỏi diễn đàn.",
        restore: "Đã khôi phục.",
      };
      toast.success(labels[action]);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync({ id: pendingDelete, type });
      toast.success("Đã xoá.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const items = forum.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "posts", label: "Bài đăng" },
          { value: "replies", label: "Trả lời" },
        ]}
      />
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "active", label: "Hiển thị" },
          { value: "removed", label: "Đã ẩn" },
        ]}
      />

      {forum.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : forum.isError ? (
        <ErrorState message={errorMessage(forum.error)} onRetry={() => void forum.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="Không có nội dung" description="Chưa có dữ liệu ở mục này." />
      ) : (
        items.map((item) => {
          const removed = item.status === "removed";
          return (
            <Card key={item.id} className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={removed ? "danger" : "ok"}>{removed ? "Đã ẩn" : "Hiển thị"}</Chip>
                {item.is_pinned && <Chip tone="info">Ghim</Chip>}
                {item.is_locked && <Chip tone="warn">Khoá</Chip>}
              </div>

              {item.title && (
                <p className="text-[14px] leading-snug font-medium">{truncate(item.title, 80)}</p>
              )}
              <p className="text-[13.5px] leading-relaxed text-mist-300">
                {truncate(stripHtml(item.content ?? ""), 220)}
              </p>
              <p className="text-[11.5px] text-mist-500">
                {item.author_name || "Ẩn danh"} · {timeAgo(item.created_at)}
              </p>

              <div className="flex flex-wrap gap-2 border-t border-ink-800 pt-2.5">
                {kind === "posts" && (
                  <>
                    <IconButton
                      icon={item.is_pinned ? PinOff : Pin}
                      label={item.is_pinned ? "Bỏ ghim" : "Ghim"}
                      onClick={() => void act(item.id, "pin", !item.is_pinned)}
                    />
                    <IconButton
                      icon={item.is_locked ? LockOpen : Lock}
                      label={item.is_locked ? "Mở khoá" : "Khoá"}
                      onClick={() => void act(item.id, "lock", !item.is_locked)}
                    />
                  </>
                )}
                {removed ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={RotateCcw}
                    onClick={() => void act(item.id, "restore")}
                  >
                    Khôi phục
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={X}
                    onClick={() => void act(item.id, "remove")}
                  >
                    Ẩn
                  </Button>
                )}
                <IconButton
                  icon={Trash2}
                  label="Xoá vĩnh viễn"
                  tone="danger"
                  className="ml-auto"
                  onClick={() => setPendingDelete(item.id)}
                />
              </div>
            </Card>
          );
        })
      )}

      <ConfirmSheet
        open={pendingDelete !== null}
        title="Xoá vĩnh viễn?"
        message="Nội dung sẽ bị xoá hẳn khỏi cơ sở dữ liệu, không khôi phục được. Muốn giữ lại để xem sau thì dùng Ẩn."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
