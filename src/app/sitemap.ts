import type { MetadataRoute } from "next";
import { getNews } from "@/lib/data/content-service";
import { siteConfig } from "@/lib/constants/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const news = await getNews("published").catch(() => []);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/events`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/su-kien`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/esports`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${siteConfig.url}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/tin-tuc`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/calendar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/lich`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/lien-he`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/chinh-sach-bao-mat`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/terms-of-use`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/dieu-khoan-su-dung`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${siteConfig.url}/news/${item.slug}`,
    lastModified: new Date(item.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const viNewsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${siteConfig.url}/tin-tuc/${item.slug}`,
    lastModified: new Date(item.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...newsRoutes, ...viNewsRoutes];
}
