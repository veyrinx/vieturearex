import type { Metadata } from "next";
import { EventJsonLd, OrganizationJsonLd } from "next-seo";
import { HeroBanner } from "@/components/home/hero-banner";
import { FeaturedEvents } from "@/components/home/featured-events";
import { LatestNews } from "@/components/home/latest-news";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { JoinCommunityCta } from "@/components/home/join-community-cta";
import { AnnouncementPopup } from "@/components/home/announcement-popup";
import {
  getEvents,
  getGalleryItems,
  getNews,
  getSettings,
} from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";
import {
  buildSettingsMap,
  resolveHeroSliderSettings,
  resolveSocialLinks,
} from "@/lib/utils/site-settings";

export const metadata: Metadata = {
  title: "Trang Chủ",
  description: "Arex – Trang chủ cộng đồng Free Fire. Xem sự kiện mới nhất, tin tức Esports và nội dung cộng đồng được cập nhật hàng ngày.",
};

export const revalidate = 60;

export default async function HomePage() {
  const [events, news, gallery, settings] = await Promise.all([
    getEvents(),
    getNews("published"),
    getGalleryItems(),
    getSettings(),
  ]);

  const settingsMap = buildSettingsMap(settings);
  const socialLinks = resolveSocialLinks(settingsMap);
  const heroSlider = resolveHeroSliderSettings(settingsMap);

  // Preload ảnh hero đầu tiên để cải thiện LCP
  const firstHeroImage = heroSlider.desktopImages[0];
  const latestEvents = [...events].sort((left, right) => new Date(right.start_date).getTime() - new Date(left.start_date).getTime());
  const latestNews = [...news].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const latestGallery = [...gallery].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  const popupEnabled = settingsMap["popup.enabled"] === "true";
  const popupTitle = settingsMap["popup.title"] ?? "";
  const popupContent = settingsMap["popup.content"] ?? "";
  const heroTitle = settingsMap["home.hero.title"];
  const activeEvent = latestEvents.find((item) => item.status === "active");

  return (
    <div className="space-y-14">
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
        activeEventCount={events.filter((item) => item.status === "active").length}
        publishedNewsCount={news.length}
      />
      <div className="overflow-x-clip">
        <FeaturedEvents events={latestEvents} />
        <LatestNews news={latestNews} />
        <GalleryPreview gallery={latestGallery} />
      </div>
      <JoinCommunityCta />
    </div>
  );
}
