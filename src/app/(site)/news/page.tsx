import type { Metadata } from "next";
import { NewsList } from "@/components/news/news-list";
import { NewsSidebar } from "@/components/news/news-sidebar";
import { SectionHeading } from "@/components/common/section-heading";
import { ArticleAd } from "@/components/common/article-ad";
import { getNews } from "@/lib/data/content-service";
import { getSiteConfig } from "@/lib/server/get-site-config";

// Canonical giữ path cố định (/news) — /tin-tuc chỉ là alias redirect + noindex —
// nhưng domain và brand lấy theo host đang truy cập để ISC không tự trỏ về Arex.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const url = `${site.url}/news`;
  const title = `Tin Tức Free Fire — ${site.shortName}`;
  const description = `Cập nhật tin tức Free Fire, esports và sự kiện cộng đồng từ ${site.shortName}.`;

  return {
    title: "Tin Tức",
    description: `Tin tức Free Fire mới nhất – sự kiện in-game, cập nhật patch, tin Esports và hoạt động cộng đồng ${site.shortName}. Đọc ngay để không bỏ lỡ.`,
    alternates: {
      canonical: url,
      languages: { vi: `${site.url}/tin-tuc`, en: url },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: site.name,
      locale: "vi_VN",
      images: [{ url: site.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [site.ogImage],
    },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export const revalidate = 60;

export default async function NewsPage() {
  const [news, site] = await Promise.all([
    getNews("published", { includeContent: false }),
    getSiteConfig(),
  ]);
  const categories = Array.from(new Set(news.map((item) => item.category)));
  // Cards/sidebar only need title/slug/cover/excerpt/meta — strip the heavy `content`
  // HTML body so the SSR payload isn't bloated by every article's full text.
  const newsForList = news.map((item) => ({ ...item, content: "" }));

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Tin tức Free Fire — ${site.shortName}`,
    itemListElement: news.slice(0, 30).map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/news/${n.slug}`,
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
      {/* Banner quảng cáo đầu trang (chỉ hiện khi đã cấu hình slot) */}
      <ArticleAd slotKey="ads.slot_news_top" />
      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <div className="space-y-6">
          <NewsList news={newsForList} />
          <ArticleAd slotKey="ads.slot_news_inline" />
        </div>
        <NewsSidebar categories={categories} recentPosts={newsForList.slice(0, 4)} />
      </div>
    </div>
  );
}
