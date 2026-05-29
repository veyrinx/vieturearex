import type { MetadataRoute } from "next";
import { getEvents, getNews } from "@/lib/data/content-service";
import { getTmsTournaments } from "@/lib/tms/data";
import { siteConfig } from "@/lib/constants/site";

const BASE = siteConfig.url;

function ageInDays(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

function newsChangeFreq(days: number): MetadataRoute.Sitemap[0]["changeFrequency"] {
  if (days < 3)  return "daily";
  if (days < 14) return "weekly";
  if (days < 90) return "monthly";
  return "yearly";
}

function newsPriority(days: number): number {
  if (days < 3)  return 0.90;
  if (days < 14) return 0.80;
  if (days < 60) return 0.70;
  return 0.60;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, events, tournaments] = await Promise.all([
    getNews("published").catch(() => []),
    getEvents().catch(() => []),
    getTmsTournaments().catch(() => []),
  ]);

  const now = new Date();

  // ── Trang chính ──────────────────────────────────────────────────────────
  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE}/news`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.90,
      alternates: { languages: { vi: `${BASE}/tin-tuc` } },
    },
    {
      url: `${BASE}/events`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.90,
      alternates: { languages: { vi: `${BASE}/su-kien` } },
    },
    {
      url: `${BASE}/esports`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE}/calendar`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.80,
      alternates: { languages: { vi: `${BASE}/lich` } },
    },
    {
      url: `${BASE}/gallery`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${BASE}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.60,
    },
    {
      url: `${BASE}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.50,
      alternates: { languages: { vi: `${BASE}/lien-he` } },
    },
  ];

  // ── Trang phụ tiếng Việt ─────────────────────────────────────────────────
  const viRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/tin-tuc`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.88,
      alternates: { languages: { en: `${BASE}/news` } },
    },
    {
      url: `${BASE}/su-kien`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.88,
      alternates: { languages: { en: `${BASE}/events` } },
    },
    {
      url: `${BASE}/lich`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
      alternates: { languages: { en: `${BASE}/calendar` } },
    },
    {
      url: `${BASE}/lien-he`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.48,
      alternates: { languages: { en: `${BASE}/contact` } },
    },
  ];

  // ── Trang pháp lý ────────────────────────────────────────────────────────
  const legalRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.20,
      alternates: { languages: { vi: `${BASE}/chinh-sach-bao-mat` } },
    },
    {
      url: `${BASE}/terms-of-use`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.20,
      alternates: { languages: { vi: `${BASE}/dieu-khoan-su-dung` } },
    },
  ];

  // ── Bài viết EN ──────────────────────────────────────────────────────────
  const newsRoutes: MetadataRoute.Sitemap = news.map((item) => {
    const pubDate = item.created_at;
    const days = ageInDays(pubDate);
    return {
      url: `${BASE}/news/${item.slug}`,
      lastModified: new Date(pubDate),
      changeFrequency: newsChangeFreq(days),
      priority: newsPriority(days),
      alternates: { languages: { vi: `${BASE}/tin-tuc/${item.slug}` } },
    };
  });

  // ── Bài viết VI ──────────────────────────────────────────────────────────
  const viNewsRoutes: MetadataRoute.Sitemap = news.map((item) => {
    const pubDate = item.created_at;
    const days = ageInDays(pubDate);
    return {
      url: `${BASE}/tin-tuc/${item.slug}`,
      lastModified: new Date(pubDate),
      changeFrequency: newsChangeFreq(days),
      priority: Math.max(0.55, newsPriority(days) - 0.02),
      alternates: { languages: { en: `${BASE}/news/${item.slug}` } },
    };
  });

  // ── Events — thêm vào /events với lastModified chính xác ─────────────────
  const activeOrUpcoming = events.filter(
    (e) => e.status === "active" || e.status === "upcoming",
  );
  const eventsLastMod = activeOrUpcoming.length > 0
    ? new Date(activeOrUpcoming[0].start_date)
    : now;

  const eventRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/events`,
      lastModified: eventsLastMod,
      changeFrequency: "daily",
      priority: 0.92,
    },
    {
      url: `${BASE}/su-kien`,
      lastModified: eventsLastMod,
      changeFrequency: "daily",
      priority: 0.90,
    },
  ];

  // ── Tournaments ──────────────────────────────────────────────────────────
  const tournamentRoutes: MetadataRoute.Sitemap = tournaments.map((t) => ({
    url: `${BASE}/tournaments/${t.slug}`,
    lastModified: new Date(t.created_at),
    changeFrequency: t.status === "ongoing" ? "daily" : t.status === "registering" ? "weekly" : "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority: t.status === "ongoing" ? 0.85 : t.status === "registering" ? 0.78 : 0.60,
  }));

  return [
    ...coreRoutes,
    ...viRoutes,
    ...legalRoutes,
    ...newsRoutes,
    ...viNewsRoutes,
    // Ghi đè /events và /su-kien với lastModified chính xác hơn từ DB
    ...eventRoutes,
    ...tournamentRoutes,
  ];
}
