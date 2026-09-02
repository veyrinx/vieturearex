import type { MetadataRoute } from "next";
import { getEvents, getNews } from "@/lib/data/content-service";
import { getTmsTournaments } from "@/lib/tms/data";
import { getAllWeapons, getAllLoadouts } from "@/lib/data/ff-data";
import { WEAPON_TYPES } from "@/lib/constants/weapon-types";
import { getAllCharacters, ROLE_META } from "@/lib/data/ff-characters";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { siteConfig } from "@/lib/constants/site";
import { SITE_ROUTES } from "@/lib/constants/site-routes";

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

/**
 * Trang chỉ có nghĩa với người đã đăng nhập, hoặc là bước trong một luồng —
 * không đưa vào sitemap (robots.ts cũng chặn phần lớn trong số này).
 */
const PRIVATE_ROUTES = new Set<string>([
  "/login", "/register", "/join", "/setup", "/updating",
  "/profile", "/notifications", "/favorites",
  "/telegram-link", "/discord-link",
  "/wiki/create",
  "/shop/dang-ky-ban", "/shop/dang-tin", "/shop/tin-cua-toi",
  "/shop/don-hang", "/shop/gian-hang", "/shop/nhan-su", "/shop/ctv",
  "/tournaments/my-team", "/tournaments/propose",
  "/partnership/hop-dong",
]);

/**
 * Mỗi trang mới thêm vào SITE_ROUTES tự có mặt trong sitemap.
 *
 * Sinh ra vì đợt v1.3.0: /check-scam, /theo-doi-nick, /nhiem-vu lên rồi mà
 * sitemap vẫn không biết — danh sách bên dưới viết tay nên cứ thêm trang là
 * quên. Mục nào đã được khai tay (có priority/alternates riêng) thì bản khai
 * tay thắng, xem bước gộp ở cuối hàm.
 */
function autoRoutes(now: Date): MetadataRoute.Sitemap {
  return SITE_ROUTES.filter((r) => !PRIVATE_ROUTES.has(r)).map((route) => ({
    url: route === "/" ? BASE : `${BASE}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority: 0.5,
  }));
}

/** Gộp trùng theo URL, mục SAU thắng — bản khai tay luôn nằm sau bản tự sinh. */
function dedupe(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[0]>();
  for (const e of entries) byUrl.set(e.url, e);
  return [...byUrl.values()];
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
    },
    {
      url: `${BASE}/events`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.90,
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
      // Trang đội ngũ: tín hiệu E-E-A-T (ai đứng sau nội dung), Google chấm khá
      // nặng cho site tin tức. Đổi thường xuyên vì mục "đang làm gì" cập nhật
      // theo tuần.
      url: `${BASE}/team`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.60,
    },
    {
      url: `${BASE}/partnership`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      // Biểu mẫu ký hợp đồng hợp tác — trang đích cho truy vấn "hợp tác với Arex".
      // Bản hợp đồng của từng đối tác (/partnership/hop-dong/[id]) thì noindex.
      url: `${BASE}/partnership/hop-dong`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.45,
    },
    {
      url: `${BASE}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.50,
    },
    {
      url: `${BASE}/name-generator`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.60,
    },
    {
      url: `${BASE}/countdown`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    },
    {
      url: `${BASE}/server-status`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.55,
    },
    {
      url: `${BASE}/kd-calculator`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/trending`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.70,
    },
    {
      url: `${BASE}/safe-topup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/free-characters`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.60,
    },
    {
      url: `${BASE}/content-roadmap`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.60,
    },
    {
      url: `${BASE}/coming-soon`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    },
    {
      url: `${BASE}/newsletter`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.50,
    },
    {
      url: `${BASE}/account-value`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.58,
    },
    {
      url: `${BASE}/player-lookup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.58,
    },
    {
      url: `${BASE}/player-compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.56,
    },
    {
      url: `${BASE}/top-players-vn`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE}/prime-store`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE}/tiktok`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    },
    {
      url: `${BASE}/topup-calculator`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/quiz`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.62,
    },
    {
      url: `${BASE}/quiz-leaderboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.55,
    },
    {
      url: `${BASE}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.70,
    },
    {
      url: `${BASE}/sensitivity`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.60,
    },
    {
      url: `${BASE}/tier-list`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.60,
    },
    {
      url: `${BASE}/combo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.58,
    },
    {
      url: `${BASE}/submit-article`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.50,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
    },
    {
      url: `${BASE}/terms-of-use`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.25,
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
    },
    {
      url: `${BASE}/weapons`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${BASE}/weapons/compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${BASE}/weapons/loadout`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...WEAPON_TYPES.map((t) => ({
      url: `${BASE}/weapons/types/${t.value}`,
      lastModified: now,
      changeFrequency: "weekly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
    ...weapons.map((w) => ({
      url: `${BASE}/weapons/${w.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.60,
    })),
    ...loadouts.map((l) => ({
      url: `${BASE}/weapons/loadout/${l.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.55,
    })),
    {
      url: `${BASE}/characters`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${BASE}/characters/compare`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    ...Object.keys(ROLE_META).map((role) => ({
      url: `${BASE}/characters/roles/${role}`,
      lastModified: now,
      changeFrequency: "weekly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
    ...getAllCharacters().map((c) => ({
      url: `${BASE}/characters/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: 0.58,
    })),
  ];

  return dedupe([
    // Tự sinh trước, khai tay sau — khai tay ghi đè.
    ...autoRoutes(now),
    ...coreRoutes,
    ...legalRoutes,
    ...newsRoutes,
    // Ghi đè /events với lastModified chính xác hơn từ DB
    ...eventRoutes,
    ...tournamentRoutes,
    ...wikiRoutes,
    ...ffRoutes,
  ]);
}
