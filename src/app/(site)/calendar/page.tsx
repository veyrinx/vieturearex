import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
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
      <SectionHeading
        eyebrow="Sự kiện"
        title="LỊCH SỰ KIỆN"
        description="Hiển thị theo tháng, lọc theo khoảng ngày và trạng thái sự kiện."
      />
      <EventTimeline initialEvents={events} />
    </div>
  );
}
