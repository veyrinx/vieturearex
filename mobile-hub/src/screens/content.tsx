import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarRange,
  ExternalLink,
  Image as ImageIcon,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  SearchInput,
  Segmented,
  Skeleton,
  type ChipTone,
} from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import {
  useDeleteEvent,
  useDeleteGallery,
  useDeleteNews,
  useEvents,
  useGallery,
  useNews,
} from "@/lib/queries";
import { formatDate, timeAgo, truncate } from "@/lib/format";
import { openExternal } from "@/lib/native";
import { env } from "@/env";
import type { EventItem, GalleryItem, NewsItem } from "@/types";

type Tab = "news" | "events" | "gallery";

type PendingDelete = { kind: Tab; id: string; label: string } | null;

export function ContentScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? "news";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingDelete>(null);

  const news = useNews();
  const events = useEvents();
  const gallery = useGallery();

  const deleteNews = useDeleteNews();
  const deleteEvent = useDeleteEvent();
  const deleteGallery = useDeleteGallery();

  const active = tab === "news" ? news : tab === "events" ? events : gallery;
  const deleting = deleteNews.isPending || deleteEvent.isPending || deleteGallery.isPending;

  const filteredNews = useFiltered(news.data, search, (item) => `${item.title} ${item.category}`);
  const filteredEvents = useFiltered(events.data, search, (item) => item.title);
  const filteredGallery = useFiltered(gallery.data, search, (item) => item.tag);

  async function confirmDelete() {
    if (!pending) return;
    try {
      if (pending.kind === "news") await deleteNews.mutateAsync(pending.id);
      if (pending.kind === "events") await deleteEvent.mutateAsync(pending.id);
      if (pending.kind === "gallery") await deleteGallery.mutateAsync(pending.id);
      toast.success("Đã xoá.");
      setPending(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={(value) => {
          setTab(value);
          setSearch("");
        }}
        options={[
          { value: "news", label: "Tin tức", count: news.data?.length },
          { value: "events", label: "Sự kiện", count: events.data?.length },
          { value: "gallery", label: "Thư viện", count: gallery.data?.length },
        ]}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên…" />

      {active.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : active.isError ? (
        <ErrorState message={errorMessage(active.error)} onRetry={() => void active.refetch()} />
      ) : tab === "news" ? (
        filteredNews.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={search ? "Không tìm thấy bài viết" : "Chưa có bài viết"}
            description={search ? "Thử từ khoá khác." : "Bấm nút + để đăng bài đầu tiên."}
            action={
              !search ? (
                <Button size="sm" icon={Plus} onClick={() => navigate("/dang")}>
                  Đăng bài
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredNews.map((item) => (
              <NewsRow
                key={item.id}
                item={item}
                onEdit={() => navigate("/dang", { state: { kind: "news", item } })}
                onDelete={() => setPending({ kind: "news", id: item.id, label: item.title })}
              />
            ))}
          </div>
        )
      ) : tab === "events" ? (
        filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={search ? "Không tìm thấy sự kiện" : "Chưa có sự kiện"}
            description={search ? "Thử từ khoá khác." : "Bấm nút + để tạo sự kiện."}
          />
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((item) => (
              <EventRow
                key={item.id}
                item={item}
                onEdit={() => navigate("/dang", { state: { kind: "event", item } })}
                onDelete={() => setPending({ kind: "events", id: item.id, label: item.title })}
              />
            ))}
          </div>
        )
      ) : filteredGallery.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={search ? "Không tìm thấy ảnh" : "Thư viện trống"}
          description={search ? "Thử nhãn khác." : "Bấm nút + để thêm ảnh."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredGallery.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              onDelete={() => setPending({ kind: "gallery", id: item.id, label: item.tag })}
            />
          ))}
        </div>
      )}

      <ConfirmSheet
        open={pending !== null}
        title="Xoá vĩnh viễn?"
        message={`"${truncate(pending?.label ?? "", 80)}" sẽ bị xoá khỏi website và không khôi phục được.`}
        confirmLabel="Xoá"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function useFiltered<T>(items: T[] | undefined, search: string, toText: (item: T) => string) {
  return useMemo(() => {
    const list = items ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) => toText(item).toLowerCase().includes(needle));
    // `toText` là hàm inline, cố tình không đưa vào deps để tránh tính lại mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search]);
}

function NewsRow({
  item,
  onEdit,
  onDelete,
}: {
  item: NewsItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex gap-3 p-3">
      <img
        src={item.cover}
        alt=""
        loading="lazy"
        className="size-18 shrink-0 rounded-xl border border-ink-700 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Chip tone={item.status === "published" ? "ok" : "warn"}>
            {item.status === "published" ? "Đã đăng" : "Nháp"}
          </Chip>
          <Chip>{item.category}</Chip>
        </div>
        <p className="mt-1.5 text-[14px] leading-snug font-medium">{truncate(item.title, 68)}</p>
        <p className="mt-1 text-[11.5px] text-mist-500">
          {timeAgo(item.created_at)}
          {item.created_by_name ? ` · ${item.created_by_name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <IconButton icon={Pencil} label="Sửa" onClick={onEdit} />
        <IconButton
          icon={ExternalLink}
          label="Xem trên web"
          onClick={() => void openExternal(`${env.apiBaseUrl}/news/${item.slug}`)}
        />
        <IconButton icon={Trash2} label="Xoá" tone="danger" onClick={onDelete} />
      </div>
    </Card>
  );
}

const EVENT_TONE: Record<EventItem["status"], ChipTone> = {
  active: "ok",
  upcoming: "info",
  expired: "neutral",
};

const EVENT_LABEL: Record<EventItem["status"], string> = {
  active: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  expired: "Đã kết thúc",
};

function EventRow({
  item,
  onEdit,
  onDelete,
}: {
  item: EventItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex gap-3 p-3">
      <img
        src={item.thumbnail_url || item.image_url}
        alt=""
        loading="lazy"
        className="size-18 shrink-0 rounded-xl border border-ink-700 object-cover"
      />
      <div className="min-w-0 flex-1">
        <Chip tone={EVENT_TONE[item.status] ?? "neutral"}>
          {EVENT_LABEL[item.status] ?? item.status}
        </Chip>
        <p className="mt-1.5 text-[14px] leading-snug font-medium">{truncate(item.title, 68)}</p>
        <p className="mt-1 text-[11.5px] text-mist-500">
          {formatDate(item.start_date)} → {formatDate(item.end_date)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <IconButton icon={Pencil} label="Sửa" onClick={onEdit} />
        <IconButton icon={Trash2} label="Xoá" tone="danger" onClick={onDelete} />
      </div>
    </Card>
  );
}

function GalleryCard({ item, onDelete }: { item: GalleryItem; onDelete: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl2 border border-ink-700 bg-ink-850">
      <img src={item.image_url} alt="" loading="lazy" className="aspect-4/3 w-full object-cover" />
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="truncate text-[12px] text-mist-300">{item.tag}</span>
        <IconButton icon={Trash2} label="Xoá ảnh" tone="danger" onClick={onDelete} />
      </div>
    </div>
  );
}
