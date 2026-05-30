import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";
import { AppProviders } from "@/components/providers/app-providers";
import { PageViewTracker } from "@/components/common/page-view-tracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { getSiteConfig } from "@/lib/server/get-site-config";

// GFF Fonts are loaded from fonts.css
// Heading: --font-heading (GFF Latin ExtraBold)
// Body: --font-body (GFF Latin Regular)

export async function generateMetadata(): Promise<Metadata> {
  const [settings, activeSite] = await Promise.all([getSettings(), getSiteConfig()]);
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
    alternates: {
      canonical: activeSite.url,
    },
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
      url: activeSite.url,
      siteName: siteName,
      images: [
        {
          url: activeSite.ogImage,
          width: 1200,
          height: 630,
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

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://googlevideo.com" />
        {/* Preload font chính để giảm blocking */}
        <link rel="preload" href="/fonts/GFF-Latin-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Announcement bar: set --banner-h before first paint to prevent layout shift */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('cskh-bar-v1')!=='1')document.documentElement.style.setProperty('--banner-h','40px');}catch(e){}` }} />
        {/* DMCA verification */}
        <meta name="dmca-site-verification" content="cmE4MmRVTTUvU1ozdU9Xb0lHQmxodDZwemQ0bFgyc1MvNHY5M2VWZUxYTT01" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GJCSBSTY7Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-GJCSBSTY7Y');`}
        </Script>
        {/* Google AdSense */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6400047965945515"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
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
                  target: `${activeSite.url}/news?q={search_term_string}`,
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
                email: "admin@arex.tech",
                foundingDate: "2024",
                knowsAbout: ["Free Fire", "Garena Free Fire", "Esports Việt Nam", "Game Mobile"],
                sameAs: [
                  activeSite.links.facebook,
                  activeSite.links.tiktok,
                  activeSite.links.youtube,
                ].filter((u) => Boolean(u) && !["https://youtube.com","https://facebook.com","https://tiktok.com"].includes(u as string)),
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "admin@arex.tech",
                  contactType: "customer support",
                  availableLanguage: ["Vietnamese"],
                },
              },
            ]),
          }}
        />
      </head>
      <body className={cn("font-body min-h-screen bg-background text-foreground antialiased")}>
        <AppProviders>{children}</AppProviders>
        <PageViewTracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
