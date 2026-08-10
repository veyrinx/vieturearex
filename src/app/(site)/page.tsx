import type { Metadata } from "next";
import Image from "next/image";
import { EventJsonLd, OrganizationJsonLd } from "next-seo";
import { HeroBanner } from "@/components/home/hero-banner";
import { FeaturedEvents } from "@/components/home/featured-events";
import { JoinCommunityCta } from "@/components/home/join-community-cta";
import { AnnouncementPopup } from "@/components/home/announcement-popup";
import { PulseBar } from "@/components/home/pulse-bar";
import { LivestreamPreview } from "@/components/home/livestream-preview";
import { CommunityHighlights } from "@/components/common/community-highlights";
import { ArticleAd } from "@/components/common/article-ad";
import { TOOLS } from "@/lib/constants/tools";
import {
  getEvents,
  getGalleryItems,
  getNews,
  getSettings,
} from "@/lib/data/content-service";
import { getStreams } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";
import { getSiteConfig } from "@/lib/server/get-site-config";
import { SideAds } from "@/components/home/side-ads";
import {
  buildSettingsMap,
  resolveCommunityStats,
  resolveEventsBackdrop,
  resolveHeroSliderSettings,
  resolveAdsDisplay,
  resolveHomeSideAds,
  resolveSocialLinks,
} from "@/lib/utils/site-settings";

// Layout gốc không còn tự khai canonical/og:url (xem getCurrentUrl), nên trang chủ
// tự khai — lấy domain theo host để ISC không trỏ về Arex.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  return {
    title: "Trang Chủ",
    description: `${site.shortName} – Trang chủ cộng đồng Free Fire. Xem sự kiện mới nhất, tin tức Esports và nội dung cộng đồng được cập nhật hàng ngày.`,
    alternates: { canonical: site.url },
    openGraph: { url: site.url, type: "website", siteName: site.name },
  };
}

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
  const adsDisplay = resolveAdsDisplay(settingsMap);
  const eventsBackdrop = resolveEventsBackdrop(settingsMap);
  const communityStats = resolveCommunityStats(settingsMap);

  const firstHeroImage = heroSlider.desktopImages[0];
  // The data layer already returns events/news/gallery sorted by descending date,
  // so no client-side re-sort is needed here.
  // Strip the heavy news `content` HTML body before handing news to client components:
  // the ticker only reads title/slug/cover/category/date, so serializing every
  // published article's full body into the RSC/HTML payload is pure waste.
  // Cắt trước rồi mới map: từ khi khối tin tức rời khỏi trang chủ, chỉ còn 8 mục
  // chạy trên ticker — map cả danh sách rồi vứt gần hết là làm không công.
  const tickerNews = news.slice(0, 8).map((item) => ({ ...item, content: "" }));

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
      {/* Hai cột này vốn `hidden xl:block` nên chỉ có mặt ở desktop — chốt được
          ngay từ server, không cần đợi client đo màn hình như AdSense. */}
      {adsDisplay.showOnDesktop && <SideAds left={sideAds.left} right={sideAds.right} />}
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

      {/* Ambient background cho toàn bộ khu nội dung */}
      {/* Hai quả cầu này từng dùng `blur-[120px]` trên khối 600px — một lớp mờ
          cỡ nửa màn hình mà trình duyệt phải dựng lại mỗi khi vùng nền đổi.
          `.ambient-orb` vẽ thẳng bằng radial-gradient: nhìn y hệt, tốn ~0. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="ambient-orb absolute left-[10%] top-[30%] size-[600px]"
          style={{ ["--orb" as string]: "hsl(var(--primary)/0.06)" }}
        />
        <div
          className="ambient-orb absolute right-[5%] top-[60%] size-[500px]"
          style={{ ["--orb" as string]: "hsl(var(--brand-2)/0.06)" }}
        />
      </div>

      <div className="pb-12">
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

      {/* Nhịp trang chủ — bốn khối, khoảng cách do .home-rhythm quy định thay vì
          mỗi chỗ tự chọn một giá trị space-y. Các khối xen kẽ nền thường và
          .home-band (nền nhạt full-bleed) để mắt có điểm nghỉ khi cuộn. */}
      {/* Không đặt overflow-x-clip ở đây: nó sẽ cắt mất phần tràn mép của các
          dải full-bleed bên trong. Việc chặn tràn ngang do html lo (globals.css). */}
      <div className="home-rhythm pt-12 md:pt-16">
        {/* ① Nhịp: tin mới chạy + chỉ số cộng đồng, dính liền thành một dải */}
        <PulseBar
          news={tickerNews}
          newsCount={news.length}
          galleryCount={gallery.length}
          toolCount={TOOLS.length}
        />

        {/* Quảng cáo đặt ở ranh giới giữa hai khối, không cắt ngang nội dung
            (Google AdSense — slot Header) */}
        <ArticleAd slotKey="ads.slot_header" className="mx-auto w-full max-w-4xl" />

        {/* ② Đang diễn ra: sự kiện + livestream — cùng một mạch "ngay lúc này" */}
        <section className="home-band">
          <div className="space-y-12 md:space-y-16">
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
                  <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                    {eventsBackdrop.caption}
                  </p>
                )}
                <FeaturedEvents events={events} />
              </div>
            </div>

            {liveAndUpcomingStreams.length > 0 && (
              <LivestreamPreview streams={liveAndUpcomingStreams} />
            )}
          </div>
        </section>

        {/* (Google AdSense — slot Sidebar) */}
        <ArticleAd slotKey="ads.slot_sidebar" className="mx-auto w-full max-w-sm" />

        {/* ③ Khám phá: tâm điểm cộng đồng.
            Khối tin tức, thư viện ảnh và băng công cụ từng nằm ở đây đã được gỡ
            theo yêu cầu — nội dung của chúng vẫn còn nguyên ở /news, /gallery
            và /tools, chỉ là không dội lại ở trang chủ nữa. */}
        <section className="home-band">
          <CommunityHighlights />
        </section>

        {/* ④ Lời mời tham gia — điểm dừng cuối */}
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
      </div>
    </>
  );
}
