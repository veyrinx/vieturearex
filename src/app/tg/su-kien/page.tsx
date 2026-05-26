import { getEvents } from "@/lib/data/content-service";
import type { EventItem } from "@/lib/types/content";
import { siteConfig } from "@/lib/constants/site";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, ExternalLink } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "Đang diễn ra", color: "#10b981" },
  upcoming: { label: "Sắp diễn ra", color: "#3b82f6" },
  expired: { label: "Đã kết thúc", color: "#6b7280" },
};

function EventCard({ item }: { item: EventItem }) {
  const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.expired;
  const start = format(new Date(item.start_date), "dd/MM/yyyy", { locale: vi });
  const end = format(new Date(item.end_date), "dd/MM/yyyy", { locale: vi });
  const target = `${siteConfig.url}/su-kien/${item.id}`;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
    >
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-36 object-cover"
        />
      )}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm flex-1 line-clamp-2">{item.title}</p>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium"
            style={{ backgroundColor: `${status.color}22`, color: status.color }}
          >
            {status.label}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--tg-theme-hint-color, #888)" }}
        >
          <CalendarDays size={12} />
          <span>{start} – {end}</span>
        </div>
        {item.server_region && (
          <p
            className="text-[11px]"
            style={{ color: "var(--tg-theme-hint-color, #888)" }}
          >
            Server: {item.server_region}
          </p>
        )}
        <a
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium mt-1"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #f97316)",
            color: "var(--tg-theme-button-text-color, #fff)",
          }}
        >
          <ExternalLink size={13} />
          Xem chi tiết
        </a>
      </div>
    </div>
  );
}

export default async function TgEventsPage() {
  const events = await getEvents();
  const sorted = [...events].sort((a, b) => {
    const order = { active: 0, upcoming: 1, expired: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="font-bold text-base">Sự kiện Free Fire</h1>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--tg-theme-hint-color, #888)" }} className="text-sm text-center py-10">
          Chưa có sự kiện nào.
        </p>
      ) : (
        sorted.map((item) => <EventCard key={item.id} item={item} />)
      )}
    </div>
  );
}
