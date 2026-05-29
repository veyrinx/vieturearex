import type { Metadata } from "next";
import { NewsList } from "@/components/news/news-list";
import { NewsSidebar } from "@/components/news/news-sidebar";
import { SectionHeading } from "@/components/common/section-heading";
import { getNews } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Tin Tức",
  description: "Tin tức Free Fire mới nhất – sự kiện in-game, cập nhật patch, tin Esports và hoạt động cộng đồng Arex. Đọc ngay để không bỏ lỡ.",
  alternates: {
    canonical: `${siteConfig.url}/news`,
    languages: { vi: `${siteConfig.url}/tin-tuc`, en: `${siteConfig.url}/news` },
  },
  openGraph: {
    title: "Tin Tức Free Fire — Arex",
    description: "Cập nhật tin tức Free Fire, esports và sự kiện cộng đồng từ Arex.",
    url: `${siteConfig.url}/news`,
    type: "website",
    siteName: siteConfig.name,
    locale: "vi_VN",
    images: [{ url: `${siteConfig.url}${siteConfig.ogImage}`, width: 1200, height: 630, alt: "Tin Tức Free Fire — Arex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tin Tức Free Fire — Arex",
    description: "Cập nhật tin tức Free Fire, esports và sự kiện cộng đồng từ Arex.",
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const revalidate = 60;

export default async function NewsPage() {
  const news = await getNews("published");
  const categories = Array.from(new Set(news.map((item) => item.category)));

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tin tức Free Fire — Arex",
    itemListElement: news.slice(0, 30).map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/news/${n.slug}`,
      name: n.title,
    })),
  };

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <SectionHeading
        eyebrow="Tin tức"
        title="TIN TỨC CỘNG ĐỒNG"
        description="Sự kiện in-game, cập nhật patch, esports và hoạt động cộng đồng"
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <NewsList news={news} />
        <NewsSidebar categories={categories} recentPosts={news.slice(0, 4)} />
      </div>
    </div>
  );
}
