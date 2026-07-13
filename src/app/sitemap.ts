import type { MetadataRoute } from "next";
import { getEvents, getNews } from "@/lib/data/content-service";
import { getTmsTournaments } from "@/lib/tms/data";
import { getAllWeapons, getAllLoadouts } from "@/lib/data/ff-data";
import { WEAPON_TYPES } from "@/lib/constants/weapon-types";
import { getAllCharacters, ROLE_META } from "@/lib/data/ff-characters";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { siteConfig } from "@/lib/constants/site";

const BASE = siteConfig.url;

async function getPublishedWiki(): Promise<{ slug: string; updated_at: string }[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = await untypedFrom(db, "wiki_articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1000) as { data: { slug: string; updated_at: string }[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

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
  const [news, events, tournaments, wiki, weapons, loadouts] = await Promise.all([
    getNews("published", { includeContent: false }).catch(() => []),
    getEvents().catch(() => []),
    getTmsTournaments().catch(() => []),
    getPublishedWiki(),
    getAllWeapons().catch(() => []),
    getAllLoadouts().catch(() => []),
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

  // ── Trang phụ ────────────────────────────────────────────────────────────
  const legalRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/gui-bai-viet`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.50,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
      alternates: { languages: { vi: `${BASE}/chinh-sach-bao-mat` } },
    },
    {
      url: `${BASE}/terms-of-use`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
      alternates: { languages: { vi: `${BASE}/dieu-khoan-su-dung` } },
    },
    {
      url: `${BASE}/cookie-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.20,
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

  // ── Wiki ─────────────────────────────────────────────────────────────────
  const wikiRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/wiki`,
      lastModified: wiki[0] ? new Date(wiki[0].updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.70,
    },
    ...wiki.map((a) => ({
      url: `${BASE}/wiki/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.60,
    })),
  ];

  // ── FF Wiki: tier list + vũ khí ──────────────────────────────────────────
  const ffRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/tier-lists`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
      alternates: { languages: { vi: `${BASE}/bang-xep-hang` } },
    },
    {
      url: `${BASE}/vu-khi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${BASE}/vu-khi/so-sanh`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/vu-khi/loadout`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...WEAPON_TYPES.map((t) => ({
      url: `${BASE}/vu-khi/loai/${t.value}`,
      lastModified: now,
      changeFrequency: "weekly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
    ...weapons.map((w) => ({
      url: `${BASE}/vu-khi/${w.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.60,
    })),
    ...loadouts.map((l) => ({
      url: `${BASE}/vu-khi/loadout/${l.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.55,
    })),
    {
      url: `${BASE}/nhan-vat`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${BASE}/nhan-vat/so-sanh`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    ...Object.keys(ROLE_META).map((role) => ({
      url: `${BASE}/nhan-vat/vai-tro/${role}`,
      lastModified: now,
      changeFrequency: "weekly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
    ...getAllCharacters().map((c) => ({
      url: `${BASE}/nhan-vat/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
  ];

  return [
    ...coreRoutes,
    ...viRoutes,
    ...legalRoutes,
    ...newsRoutes,
    ...viNewsRoutes,
    // Ghi đè /events và /su-kien với lastModified chính xác hơn từ DB
    ...eventRoutes,
    ...tournamentRoutes,
    ...wikiRoutes,
    ...ffRoutes,
  ];
}
