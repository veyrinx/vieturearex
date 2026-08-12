import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";
import { AppProviders } from "@/components/providers/app-providers";
import { NativeAppShell } from "@/components/providers/native-app-shell";
import { PageViewTracker } from "@/components/common/page-view-tracker";
import { ConsoleBanner } from "@/components/common/console-banner";
import { CookieConsent } from "@/components/common/cookie-consent";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { getSiteConfig, getCurrentUrl } from "@/lib/server/get-site-config";

// GFF Fonts are loaded from fonts.css
// Heading: --font-heading (GFF Latin ExtraBold)
// Body: --font-body (GFF Latin Regular)

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Cho phép nội dung tràn ra sau tai thỏ / thanh hệ thống trong app native;
  // trình duyệt thường không bị ảnh hưởng.
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const [settings, activeSite, currentUrl] = await Promise.all([
    getSettings(),
    getSiteConfig(),
    getCurrentUrl(),
  ]);
  const settingsMap = buildSettingsMap(settings, activeSite.id);

  const siteName = settingsMap["branding.site_name"] || activeSite.name;
  const siteTitle = settingsMap["seo.default_title"] || activeSite.name;
  const siteDescription = settingsMap["seo.default_description"] || activeSite.description;
  const logoLight = settingsMap["branding.logo_light_url"] || activeSite.favicon;
  const favicon = settingsMap["branding.favicon_url"] || logoLight;

  return {
    metadataBase: new URL(activeSite.url),
    title: {
      default: siteTitle,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    // Chỉ khai canonical khi biết chắc URL của trang đang xem. Thiếu thì bỏ hẳn
    // để Google tự canonical về đúng URL nó đang crawl — an toàn hơn là trỏ sai.
    ...(currentUrl ? { alternates: { canonical: currentUrl } } : {}),
    keywords: [
      siteName,
      "Free Fire",
      "Free Fire Việt Nam",
      "tin tức Free Fire",
      "sự kiện Free Fire",
      "esports Free Fire",
      "cộng đồng Free Fire",
      "lịch sự kiện Free Fire",
      "Free Fire fan made",
      "game mobile Việt Nam",
      "Free Fire OB47",
      "Free Fire update",
      "Free Fire tournament",
      "Garena Free Fire",
      `${siteName} Free Fire`,
      "Free Fire community",
      `${siteName} gaming`,
      "tin tức game",
      "esports Việt Nam",
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      ...(currentUrl ? { url: currentUrl } : {}),
      siteName: siteName,
      images: [
        {
          url: activeSite.ogImage,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: siteName,
        },
      ],
      locale: "vi_VN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [activeSite.ogImage],
    },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    manifest: "/manifest.webmanifest",
    verification: {
      google: "vKpEfaaix3tyf3KNuLOD4z3LE4K1_5RnaU_lwqDOD9U",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSite = await getSiteConfig();
  const requestHeaders = await headers();
  const country = requestHeaders.get("x-vercel-ip-country");
  // App native (vỏ Capacitor) gắn "ArexApp/" vào User-Agent. Chính sách AdSense
  // cấm hiển thị quảng cáo trong WebView của app → không nạp loader luôn.
  const isNativeApp = /ArexApp\//.test(requestHeaders.get("user-agent") ?? "");
  // Publisher ID lấy từ Cài đặt → Quảng cáo (fallback về id mặc định của site).
  const adsenseId =
    buildSettingsMap(await getSettings())["ads.google_adsense_id"]?.trim() || "ca-pub-6400047965945515";

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* App native (vỏ Capacitor): đánh dấu <html> TRƯỚC khi vẽ để CSS
            safe-area và các rule ẩn quảng cáo áp dụng ngay, không nháy. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=window.Capacitor,u=navigator.userAgent;if((c&&c.isNativePlatform&&c.isNativePlatform())||/ArexApp\\//.test(u)){var d=document.documentElement;d.dataset.native='true';d.dataset.nativePlatform=(c&&c.getPlatform&&c.getPlatform())||(/ArexIOS/.test(u)?'ios':'android');}}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://googlevideo.com" />
        {/* Preload font chính để giảm blocking */}
        <link rel="preload" href="/fonts/GFF-Latin-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Font tiếng Việt (có dấu) — fallback cho GFF Latin thiếu glyph */}
        <link rel="preload" href="/fonts/GFF-VN-ExtraBold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Google Material Symbols (Rounded) — icon set phần public */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        {/* DMCA verification */}
        <meta name="dmca-site-verification" content="cmE4MmRVTTUvU1ozdU9Xb0lHQmxodDZwemQ0bFgyc1MvNHY5M2VWZUxYTT01" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GJCSBSTY7Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('arex-cookie-consent')==='accepted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
gtag('js',new Date());gtag('config','G-GJCSBSTY7Y');`}
        </Script>
        {/* Google AdSense — meta xác minh + loader (Publisher ID từ settings).
            Bỏ hẳn trong app native: AdSense không cho chạy trong WebView app. */}
        {!isNativeApp && (
          <>
            <meta name="google-adsense-account" content={adsenseId} />
            <Script
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
              strategy="afterInteractive"
              crossOrigin="anonymous"
            />
          </>
        )}
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: activeSite.name,
                url: activeSite.url,
                description: activeSite.description,
                inLanguage: "vi-VN",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${activeSite.url}/search?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: activeSite.name,
                url: activeSite.url,
                logo: {
                  "@type": "ImageObject",
                  url: activeSite.sidebarIcon,
                  width: 512,
                  height: 512,
                },
                description: activeSite.description,
                email: "contact@arexnetwork.site",
                foundingDate: "2024",
                knowsAbout: ["Free Fire", "Garena Free Fire", "Esports Việt Nam", "Game Mobile"],
                sameAs: [
                  activeSite.links.facebook,
                  activeSite.links.tiktok,
                  activeSite.links.youtube,
                ].filter((u) => Boolean(u) && !["https://youtube.com","https://facebook.com","https://tiktok.com"].includes(u as string)),
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "contact@arexnetwork.site",
                  contactType: "customer support",
                  availableLanguage: ["Vietnamese"],
                },
              },
            ]),
          }}
        />
      </head>
      <body className={cn("font-body min-h-screen bg-background text-foreground antialiased")}>
        <AppProviders>
          {children}
          <NativeAppShell />
        </AppProviders>
        <ConsoleBanner />
        <CookieConsent country={country} />
        <PageViewTracker />
        <Analytics />
        {/* sampleRate 0.2 = chỉ 20% lượt xem gửi số đo Web Vitals. Gói Hobby cho
            10k data point/tháng, để mặc định (100%) thì đang chạm 41k → vượt hạn
            mức. 20% vẫn đủ mẫu để p75 có ý nghĩa. Chỉnh qua biến môi trường
            NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE nếu muốn siết/nới thêm. */}
        <SpeedInsights
          sampleRate={Number(process.env.NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE ?? "0.2")}
        />
      </body>
    </html>
  );
}
