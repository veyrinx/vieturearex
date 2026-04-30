import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { BreadcrumbJsonLd } from "next-seo";
import { getNewsBySlug } from "@/lib/data/content-service";
import { RichTextRenderer, injectHeadingIds } from "@/components/news/rich-text-renderer";
import { NewsToc } from "@/components/news/news-toc";
import { NewsComments } from "@/components/news/news-comments";
import { AwardViewPoints } from "@/components/news/award-view-points";
import { siteConfig } from "@/lib/constants/site";
import { formatVietnamDate } from "@/lib/utils/vietnam-time";

type NewsDetailPageProps = { params: { slug: string } };

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const article = await getNewsBySlug(params.slug);
  if (!article) return { title: "Không tìm thấy bài viết" };
  const url = `${siteConfig.url}/news/${article.slug}`;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: url,
      languages: { vi: `${siteConfig.url}/tin-tuc/${article.slug}`, en: url },
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url,
      type: "article",
      publishedTime: article.created_at,
      modifiedTime: article.created_at,
      siteName: siteConfig.name,
      images: [{ url: article.cover, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.cover],
    },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export const revalidate = 60;

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const article = await getNewsBySlug(params.slug);
  if (!article) notFound();

  const processedHtml = injectHeadingIds(article.content);

  // Kiểm tra có heading H1/H2 không để quyết định layout
  const hasHeadings = /<h[12][\s>]/i.test(article.content);

  return (
    <div className="mx-auto max-w-7xl pt-6 md:pt-8 space-y-6">
      <AwardViewPoints newsId={article.id} />
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", item: siteConfig.url },
          { name: "Tin tức", item: `${siteConfig.url}/news` },
          { name: article.title, item: `${siteConfig.url}/news/${article.slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${siteConfig.url}/news/${article.slug}`,
            },
            headline: article.title,
            description: article.excerpt,
            image: [article.cover],
            datePublished: article.created_at,
            dateModified: article.created_at,
            author: { "@type": "Organization", name: "Arex", url: siteConfig.url },
            publisher: {
              "@type": "Organization",
              name: siteConfig.name,
              logo: { "@type": "ImageObject", url: siteConfig.sidebarIcon },
            },
            articleSection: article.category,
            inLanguage: "vi-VN",
            isAccessibleForFree: true,
          }),
        }}
      />

      {/* Header - full width */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.14em] text-primary">{article.category}</div>
        <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatVietnamDate(article.created_at)}
        </p>
      </div>
      {/* Ảnh bìa */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-border" style={{ aspectRatio: "16/7" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.cover} alt={article.title} className="absolute inset-0 h-full w-full object-cover" />
      </div>

      {/* Nội dung + mục lục - chỉ dùng 2 cột khi có heading */}
      {/* Author card reused below */}
      {hasHeadings ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
          <div className="space-y-6 min-w-0">
            <div className="glass-card rounded-2xl p-6">
              <RichTextRenderer html={processedHtml} />
            </div>
            <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 font-heading text-sm font-bold">
                AX
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Arex</p>
                <p className="text-xs text-muted-foreground">{formatVietnamDate(article.created_at)}</p>
              </div>
            </div>
            <NewsComments newsId={article.id} />
          </div>
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <NewsToc html={processedHtml} />
            </div>
          </aside>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <RichTextRenderer html={processedHtml} />
          </div>
          <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400 font-heading text-sm font-bold">
              AX
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Arex</p>
              <p className="text-xs text-muted-foreground">{formatVietnamDate(article.created_at)}</p>
            </div>
          </div>
          <NewsComments newsId={article.id} />
        </div>
      )}
    </div>
  );
}
