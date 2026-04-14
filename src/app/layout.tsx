import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/constants/site";
import { AppProviders } from "@/components/providers/app-providers";
import { SecurityGuard } from "@/components/common/security-guard";
import { PageViewTracker } from "@/components/common/page-view-tracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

// GFF Fonts are loaded from fonts.css
// Heading: --font-heading (GFF Latin ExtraBold)
// Body: --font-body (GFF Latin Regular)

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
  },
  keywords: [
    "Arex",
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
    "Arex Free Fire",
    "Free Fire community",
    "Arex gaming",
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
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: siteConfig.favicon,
    shortcut: siteConfig.favicon,
    apple: siteConfig.favicon,
  },
  verification: {
    google: "vKpEfaaix3tyf3KNuLOD4z3LE4K1_5RnaU_lwqDOD9U",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const faviconUrl = siteConfig.favicon;
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href={faviconUrl} sizes="any" />
        <link rel="apple-touch-icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://googlevideo.com" />
        {/* Preload font chính để giảm blocking */}
        <link rel="preload" href="/fonts/GFF-Latin-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
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
        {/* Google AdSense - thay YOUR_ADSENSE_ID bằng ID thật */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: siteConfig.name,
              url: siteConfig.url,
              description: siteConfig.description,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteConfig.url}/news?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={cn("font-body min-h-screen bg-background text-foreground antialiased")}>
        <AppProviders>{children}</AppProviders>
        <PageViewTracker />
        <SecurityGuard />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
