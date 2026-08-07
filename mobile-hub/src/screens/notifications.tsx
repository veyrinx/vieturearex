import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BellOff,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  Newspaper,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button, Card, Chip, EmptyState, ErrorState, Segmented, Skeleton, cx } from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import { useMarkNotifications, useNotifications } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { openExternal } from "@/lib/native";
import { env } from "@/env";
import type { NotificationItem } from "@/types";

/**
 * Hộp thông báo trong Hub.
 *
 * `src/lib/notify.ts` chỉ bắn thông báo hệ điều hành lúc app đang mở — đóng app
 * là mất. Màn này đọc thẳng từ server nên mở lúc nào cũng thấy đủ, và là chỗ
 * duy nhất đánh dấu đã đọc được.
 *
 * Đường dẫn trong `entity_url` là của website. Cái nào Hub có màn tương ứng thì
 * đi thẳng trong app, còn lại mở bằng trình duyệt hệ thống.
 */

type Filter = "unread" | "all";

/** Loại thông báo → biểu tượng + màu, để lướt mắt là biết chuyện gì. */
const KIND: Record<string, { icon: LucideIcon; tone: "info" | "ok" | "warn" | "danger" | "neutral" }> = {
  shop_order: { icon: ShoppingBag, tone: "info" },
  shop_listing: { icon: ShoppingBag, tone: "neutral" },
  shop_watchlist: { icon: Sparkles, tone: "ok" },
  new_article: { icon: Newspaper, tone: "neutral" },
  comment_reply: { icon: MessageSquare, tone: "neutral" },
  report: { icon: AlertTriangle, tone: "danger" },
};

/**
 * Những đường dẫn website mà Hub có màn hình tương đương.
 * Trật hết thì mở web — thà bật trình duyệt còn hơn đưa người dùng vào ngõ cụt.
 */
function inAppRoute(url: string): string | null {
  if (url.startsWith("/shop")) return "/cho";
  if (url.startsWith("/community") || url.startsWith("/news")) return "/duyet";
  if (url.startsWith("/admin/users")) return "/he-thong/nguoi-dung";
  if (url.startsWith("/admin")) return "/he-thong";
  return null;
}

export function NotificationsScreen() {
  const toast = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("unread");

  const notifications = useNotifications();
  const mark = useMarkNotifications();

  const items = notifications.data ?? [];
  const unread = useMemo(() => items.filter((n) => !n.read_at), [items]);
  const shown = filter === "unread" ? unread : items;

  async function open(item: NotificationItem) {
    if (!item.read_at) {
      // Đánh dấu đã đọc rồi mới đi — đi trước thì màn này bị huỷ, mutation treo.
      await mark.mutateAsync({ id: item.id }).catch(() => null);
    }
    const url = item.entity_url;
    if (!url) return;

    const route = url.startsWith("/") ? inAppRoute(url) : null;
    if (route) navigate(route);
    else await openExternal(url.startsWith("http") ? url : `${env.apiBaseUrl}${url}`);
  }

  async function markAll() {
    try {
      await mark.mutateAsync({ all: true });
      toast.success("Đã đánh dấu tất cả là đã đọc.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-3">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "unread", label: "Chưa đọc", count: unread.length },
          { value: "all", label: "Tất cả", count: items.length },
        ]}
      />

      {unread.length > 0 && (
        <Button variant="secondary" block icon={CheckCheck} loading={mark.isPending} onClick={() => void markAll()}>
          Đánh dấu tất cả đã đọc
        </Button>
      )}

      {notifications.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : notifications.isError ? (
        <ErrorState
          message={errorMessage(notifications.error)}
          onRetry={() => void notifications.refetch()}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={filter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
          description={
            filter === "unread" ? "Mọi thứ đã xem hết." : "Thông báo của hệ thống sẽ xuất hiện ở đây."
          }
        />
      ) : (
        shown.map((item) => {
          const kind = KIND[item.type] ?? { icon: Sparkles, tone: "neutral" as const };
          const Icon = kind.icon;
          return (
            <Card key={item.id} className="space-y-1.5" onClick={() => void open(item)}>
              <div className="flex items-start gap-3">
                <span
                  className={cx(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                    item.read_at ? "bg-ink-800 text-mist-500" : "bg-cyan-glow/12 text-cyan-glow",
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cx(
                      "text-sm leading-snug",
                      item.read_at ? "text-mist-300" : "font-medium text-mist-100",
                    )}
                  >
                    {item.title}
                  </p>
                  {item.body && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-mist-500">{item.body}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[12px] text-mist-500">{timeAgo(item.created_at)}</span>
                    {!item.read_at && <Chip tone={kind.tone}>Mới</Chip>}
                    {item.entity_url && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-mist-500">
                        <ExternalLink className="size-3" /> Mở
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}

      <p className="px-1 text-center text-[11px] leading-relaxed text-mist-500">
        Thông báo hệ điều hành chỉ bắn khi app đang mở. Danh sách này luôn đầy đủ.
      </p>
    </div>
  );
}
