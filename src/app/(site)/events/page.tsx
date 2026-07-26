import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { EventsGrid } from "@/components/events/events-grid";
import { getEvents } from "@/lib/data/content-service";
import { getSiteConfig } from "@/lib/server/get-site-config";

// Canonical giữ path cố định (/events) — /su-kien chỉ là alias redirect + noindex —
// nhưng domain và brand lấy theo host đang truy cập để ISC không tự trỏ về Arex.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const url = `${site.url}/events`;
  const title = `Sự kiện Free Fire — ${site.shortName}`;

  return {
    title: "Sự Kiện",
    description: `Lịch sự kiện Free Fire đầy đủ nhất – sự kiện đang diễn ra, sắp tới và đã kết thúc. Theo dõi và đừng bỏ lỡ bất kỳ sự kiện nào từ ${site.shortName}.`,
    alternates: {
      canonical: url,
      languages: { vi: `${site.url}/su-kien`, en: url },
    },
    openGraph: {
      title,
      description: "Toàn bộ sự kiện Free Fire đang diễn ra, sắp tới và đã kết thúc.",
      url,
      type: "website",
      siteName: site.name,
      locale: "vi_VN",
      images: [{ url: site.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Lịch sự kiện Free Fire đầy đủ nhất — đang diễn ra, sắp tới và đã kết thúc.",
      images: [site.ogImage],
    },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export const revalidate = 60;

export default async function EventsPage() {
  const [events, site] = await Promise.all([getEvents(), getSiteConfig()]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Sự kiện Free Fire — ${site.shortName}`,
    itemListElement: events.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: e.title,
        url: `${site.url}/events/${e.id}`,
        startDate: e.start_date,
        endDate: e.end_date || e.start_date,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus:
          e.status === "expired"
            ? "https://schema.org/EventCancelled"
            : "https://schema.org/EventScheduled",
        location: { "@type": "VirtualLocation", url: e.link || `${site.url}/events/${e.id}` },
        image: e.image_url ? [e.image_url] : undefined,
        organizer: { "@type": "Organization", name: site.name, url: site.url },
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
