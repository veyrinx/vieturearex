import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { StreamsGrid } from "@/components/esports/streams-grid";
import { getStreams, getStreamCategories } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Phát Trực Tiếp",
  description: "Xem trực tiếp các buổi phát sóng Esports Free Fire từ cộng đồng Arex. Theo dõi stream live, upcoming và các trận đấu đã kết thúc.",
  alternates: { canonical: `${siteConfig.url}/esports` },
  openGraph: {
    title: "Phát Trực Tiếp Esports Free Fire — Arex",
    description: "Stream live, upcoming và replay của cộng đồng Arex.",
    url: `${siteConfig.url}/esports`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export default async function EsportsPage() {
  const [streams, categories] = await Promise.all([
    getStreams().catch(() => []),
    getStreamCategories().catch(() => []),
  ]);

  const videoList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Phát trực tiếp Esports — Arex",
    itemListElement: streams.slice(0, 30).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": s.status === "live" ? "BroadcastEvent" : "VideoObject",
        name: s.title,
        description: `${s.category} — ${s.title}`,
        thumbnailUrl: s.thumbnail_url,
        uploadDate: s.created_at,
        contentUrl: s.youtube_url,
        embedUrl: s.youtube_url,
        url: s.youtube_url,
        ...(s.status === "live"
          ? { isLiveBroadcast: true, startDate: s.scheduled_at }
          : s.status === "upcoming"
            ? { publication: { "@type": "BroadcastEvent", isLiveBroadcast: true, startDate: s.scheduled_at } }
            : {}),
        publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
        inLanguage: "vi-VN",
      },
    })),
  };

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoList) }}
      />
      <SectionHeading
        eyebrow="Esports"
        title="PHÁT TRỰC TIẾP"
        description="Theo dõi các buổi phát trực tiếp và sự kiện của cộng đồng"
      />
      <StreamsGrid initialStreams={streams} categories={categories} />
    </div>
  );
}
