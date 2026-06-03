import type { Metadata } from "next";
import { Radio } from "lucide-react";
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
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/8 via-transparent to-orange-500/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15">
            <Radio className="size-6 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Live · Esports</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Phát Trực Tiếp
            </h1>
            <p className="text-sm text-muted-foreground">Theo dõi các buổi phát trực tiếp và sự kiện của cộng đồng</p>
          </div>
        </div>
      </div>
      <StreamsGrid initialStreams={streams} categories={categories} />
    </div>
  );
}
