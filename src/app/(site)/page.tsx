import type { Metadata } from "next";
import Image from "next/image";
import { EventJsonLd, OrganizationJsonLd } from "next-seo";
import { HeroBanner } from "@/components/home/hero-banner";
import { FeaturedEvents } from "@/components/home/featured-events";
import { LatestNews } from "@/components/home/latest-news";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { JoinCommunityCta } from "@/components/home/join-community-cta";
import { AnnouncementPopup } from "@/components/home/announcement-popup";
import { NewsTicker } from "@/components/home/news-ticker";
import { StatsBar } from "@/components/home/stats-bar";
import { LivestreamPreview } from "@/components/home/livestream-preview";
import { CommunityHighlights } from "@/components/common/community-highlights";
import { ToolsShowcase } from "@/components/common/tools-showcase";
import { TOOLS } from "@/lib/constants/tools";
import {
  getEvents,
  getGalleryItems,
  getNews,
  getSettings,
} from "@/lib/data/content-service";
import { getStreams } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";
import { SideAds } from "@/components/home/side-ads";
import {
  buildSettingsMap,
  resolveCommunityStats,
  resolveEventsBackdrop,
  resolveHeroSliderSettings,
  resolveHomeSideAds,
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
    getNews("published", { includeContent: false }),
    getGalleryItems(),
    getSettings(),
    getStreams(),
  ]);

  const settingsMap = buildSettingsMap(settings);
  const socialLinks = resolveSocialLinks(settingsMap);
  const heroSlider = resolveHeroSliderSettings(settingsMap);
  const sideAds = resolveHomeSideAds(settingsMap);
  const eventsBackdrop = resolveEventsBackdrop(settingsMap);
  const communityStats = resolveCommunityStats(settingsMap);

  const firstHeroImage = heroSlider.desktopImages[0];
  // The data layer already returns events/news/gallery sorted by descending date,
  // so no client-side re-sort is needed here.
  // Strip the heavy news `content` HTML body before handing news to client components:
  // the ticker and cards only read title/slug/cover/category/date, so serializing every
  // published article's full body into the RSC/HTML payload is pure waste.
  const newsForDisplay = news.map((item) => ({ ...item, content: "" }));

  const popupEnabled = settingsMap["popup.enabled"] === "true";
  const popupTitle = settingsMap["popup.title"] ?? "";
  const popupContent = settingsMap["popup.content"] ?? "";
  const popupImageUrl = settingsMap["popup.image_url"] ?? "";
  const popupLinkUrl = settingsMap["popup.link_url"] ?? "";
  const heroTitle = settingsMap["home.hero.title"];
  const activeEvent = events.find((e) => e.status === "active");

  const nextUpcomingEvent = events
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  const liveAndUpcomingStreams = streams.filter((s) => s.status === "live" || s.status === "upcoming");

  return (
    <>
      <SideAds left={sideAds.left} right={sideAds.right} />
      {firstHeroImage && (
        // eslint-disable-next-line @next/next/no-head-element
        <link rel="preload" as="image" href={firstHeroImage} fetchPriority="high" />
      )}
      {popupEnabled && (popupContent || popupImageUrl) && (
        <AnnouncementPopup
          title={popupTitle}
          content={popupContent}
          imageUrl={popupImageUrl}
          linkUrl={popupLinkUrl}
        />
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

      <div className="space-y-12 pb-12 md:space-y-20 lg:space-y-24">
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

      <NewsTicker news={newsForDisplay.slice(0, 8)} />

      <StatsBar
        eventCount={events.length}
        newsCount={news.length}
        galleryCount={gallery.length}
        toolCount={TOOLS.length}
      />

      {/* Subtle ambient background for content sections */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute left-[10%] top-[30%] size-[600px] rounded-full bg-primary/[0.03] blur-[120px] dark:bg-amber-400/[0.04]" />
        <div className="absolute right-[5%] top-[60%] size-[500px] rounded-full bg-violet-500/[0.025] blur-[100px]" />
      </div>

      <div className="space-y-12 overflow-x-clip md:space-y-20 lg:space-y-24">
        <div className="relative isolate">
          {(eventsBackdrop.imageUrl || eventsBackdrop.videoUrl) && (
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
              {eventsBackdrop.videoUrl ? (
                <video
                  src={eventsBackdrop.videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  poster={eventsBackdrop.imageUrl || undefined}
                  className="absolute inset-0 size-full object-cover"
                  aria-hidden="true"
                />
              ) : (
                <Image
                  src={eventsBackdrop.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="100vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background" />
            </div>
          )}
          <div className={(eventsBackdrop.imageUrl || eventsBackdrop.videoUrl) ? "px-4 py-10 md:px-8 md:py-14" : ""}>
            {eventsBackdrop.caption && (eventsBackdrop.imageUrl || eventsBackdrop.videoUrl) && (
              <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-primary dark:text-amber-400">
                {eventsBackdrop.caption}
              </p>
            )}
            <FeaturedEvents events={events} />
          </div>
        </div>
        {liveAndUpcomingStreams.length > 0 && (
          <LivestreamPreview streams={liveAndUpcomingStreams} />
        )}
        <LatestNews news={newsForDisplay.slice(0, 6)} />
        <GalleryPreview gallery={gallery.slice(0, 6)} />

        {/* Công cụ (cuộn ngang) */}
        <div className="container-main">
          <ToolsShowcase />
        </div>

        {/* Tâm điểm cộng đồng */}
        <div className="container-main">
          <CommunityHighlights />
        </div>
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
    </>
  );
}
