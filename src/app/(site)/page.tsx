import type { Metadata } from "next";
import { EventJsonLd, OrganizationJsonLd } from "next-seo";
import { HeroBanner } from "@/components/home/hero-banner";
import { FeaturedEvents } from "@/components/home/featured-events";
import { LatestNews } from "@/components/home/latest-news";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { JoinCommunityCta } from "@/components/home/join-community-cta";
import { AnnouncementPopup } from "@/components/home/announcement-popup";
import { NewsTicker } from "@/components/home/news-ticker";
import { LivestreamPreview } from "@/components/home/livestream-preview";
import {
  getEvents,
  getGalleryItems,
  getNews,
  getSettings,
} from "@/lib/data/content-service";
import { getStreams } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";
import {
  buildSettingsMap,
  resolveCommunityStats,
  resolveHeroSliderSettings,
  resolveSocialLinks,
} from "@/lib/utils/site-settings";

export const metadata: Metadata = {
  title: "Trang Chủ",
  description: "Arex NetWork – Trang chủ cộng đồng Free Fire. Xem sự kiện mới nhất, tin tức Esports và nội dung cộng đồng được cập nhật hàng ngày.",
};

export const revalidate = 60;

export default async function HomePage() {
  const [events, news, gallery, settings, streams] = await Promise.all([
    getEvents(),
    getNews("published"),
    getGalleryItems(),
    getSettings(),
    getStreams(),
  ]);

  const settingsMap = buildSettingsMap(settings);
  const socialLinks = resolveSocialLinks(settingsMap);
  const heroSlider = resolveHeroSliderSettings(settingsMap);
  const communityStats = resolveCommunityStats(settingsMap);

  const firstHeroImage = heroSlider.desktopImages[0];
  const latestEvents = [...events].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  const latestNews = [...news].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestGallery = [...gallery].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const popupEnabled = settingsMap["popup.enabled"] === "true";
  const popupTitle = settingsMap["popup.title"] ?? "";
  const popupContent = settingsMap["popup.content"] ?? "";
  const heroTitle = settingsMap["home.hero.title"];
  const activeEvent = latestEvents.find((e) => e.status === "active");

  const nextUpcomingEvent = latestEvents
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  const liveAndUpcomingStreams = streams.filter((s) => s.status === "live" || s.status === "upcoming");

  return (
    <div className="space-y-20 md:space-y-24 pb-12">
      {firstHeroImage && (
        // eslint-disable-next-line @next/next/no-head-element
        <link rel="preload" as="image" href={firstHeroImage} fetchPriority="high" />
      )}
      {popupEnabled && popupContent && (
        <AnnouncementPopup title={popupTitle} content={popupContent} />
      )}
      <OrganizationJsonLd
        type="Organization"
        name={siteConfig.name}
        url={siteConfig.url}
        sameAs={[socialLinks.facebook, socialLinks.youtube, socialLinks.tiktok]}
      />

      {activeEvent ? (
        <EventJsonLd
          name={activeEvent.title}
          startDate={activeEvent.start_date}
          endDate={activeEvent.end_date}
          location="Arex Hub"
          description={activeEvent.description || siteConfig.description}
          url={activeEvent.link ?? `${siteConfig.url}/calendar`}
          image={[activeEvent.image_url]}
        />
      ) : null}

      <HeroBanner
        heroTitle={heroTitle}
        desktopBackgroundUrls={heroSlider.desktopImages}
        mobileBackgroundUrls={heroSlider.mobileImages}
        sliderIntervalMs={heroSlider.intervalMs}
        transitionMs={heroSlider.transitionMs}
        transitionEffect={heroSlider.transitionEffect}
        activeEventCount={events.filter((e) => e.status === "active").length}
        publishedNewsCount={news.length}
        galleryCount={gallery.length}
        nextEventDate={nextUpcomingEvent?.start_date ?? null}
      />

      <NewsTicker news={latestNews.slice(0, 8)} />

      <div className="space-y-20 overflow-x-clip md:space-y-24">
        <FeaturedEvents events={latestEvents} />
        {liveAndUpcomingStreams.length > 0 && (
          <LivestreamPreview streams={liveAndUpcomingStreams} />
        )}
        <LatestNews news={latestNews} />
        <GalleryPreview gallery={latestGallery} />
      </div>

      <JoinCommunityCta
        facebook={socialLinks.facebook}
        youtube={socialLinks.youtube}
        tiktok={socialLinks.tiktok}
        community={siteConfig.links.community}
        daysActive={communityStats.daysActive}
        facebookMembers={communityStats.facebookMembers}
        youtubeSubscribers={communityStats.youtubeSubscribers}
        tiktokFollowers={communityStats.tiktokFollowers}
        zaloMembers={communityStats.zaloMembers}
      />
    </div>
  );
}
