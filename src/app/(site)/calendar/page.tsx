import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { EventTimeline } from "@/components/timeline/event-timeline";
import { getEvents } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Lịch",
  description:
    "Timeline hiển thị theo tháng, có thể lọc theo khoảng ngày cụ thể và trạng thái sự kiện.",
  alternates: {
    canonical: `${siteConfig.url}/calendar`,
    languages: { vi: `${siteConfig.url}/lich`, en: `${siteConfig.url}/calendar` },
  },
  openGraph: {
    title: "Lịch sự kiện Free Fire — Arex",
    description: "Timeline đầy đủ sự kiện trong tháng, lọc theo trạng thái và server.",
    url: `${siteConfig.url}/calendar`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const revalidate = 60;

export default async function CalendarPage() {
  const events = await getEvents();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lịch sự kiện Free Fire — Arex",
    itemListElement: events.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: e.title,
        url: `${siteConfig.url}/events/${e.id}`,
        startDate: e.start_date,
        endDate: e.end_date || e.start_date,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus:
          e.status === "expired"
            ? "https://schema.org/EventCancelled"
            : "https://schema.org/EventScheduled",
        location: { "@type": "VirtualLocation", url: e.link || `${siteConfig.url}/events/${e.id}` },
        image: e.image_url ? [e.image_url] : undefined,
        organizer: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
      },
    })),
  };

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-primary/5 dark:from-amber-400/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15">
            <CalendarDays className="size-6 text-blue-500" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Free Fire</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Lịch Sự Kiện
            </h1>
            <p className="text-sm text-muted-foreground">
              Hiển thị theo tháng, lọc theo khoảng ngày và trạng thái sự kiện
            </p>
          </div>
          <div className="ml-auto hidden sm:block text-right shrink-0">
            <p className="font-heading text-3xl font-black tabular-nums text-blue-500">{events.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sự kiện</p>
          </div>
        </div>
      </div>
      <EventTimeline initialEvents={events} />
    </div>
  );
}
