import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { EventsGrid } from "@/components/events/events-grid";
import { getEvents } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Sự Kiện",
  description: "Lịch sự kiện Free Fire đầy đủ nhất – sự kiện đang diễn ra, sắp tới và đã kết thúc. Theo dõi và đừng bỏ lỡ bất kỳ sự kiện nào từ Arex.",
  alternates: {
    canonical: `${siteConfig.url}/events`,
    languages: { vi: `${siteConfig.url}/su-kien`, en: `${siteConfig.url}/events` },
  },
  openGraph: {
    title: "Sự kiện Free Fire — Arex",
    description: "Toàn bộ sự kiện Free Fire đang diễn ra, sắp tới và đã kết thúc.",
    url: `${siteConfig.url}/events`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getEvents();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sự kiện Free Fire — Arex",
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
      <SectionHeading
        eyebrow="Sự kiện"
        title="TOÀN BỘ SỰ KIỆN CỘNG ĐỒNG"
        description="Lọc theo trạng thái, ngày và server — nhấn card để xem chi tiết nhanh"
      />
      <EventsGrid initialEvents={events} />
    </div>
  );
}
