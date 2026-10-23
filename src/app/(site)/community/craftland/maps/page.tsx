import type { Metadata } from "next";
import { Suspense } from "react";
import { MapFilters } from "@/components/craftland/map-filters";
import { MapGrid } from "@/components/craftland/map-card";
import { Pagination } from "@/components/craftland/pagination";
import { getCategories, listPublishedMaps } from "@/lib/server/craftland";
import { CRAFTLAND_MAPS, MAP_PAGE_SIZE, MAP_PERIODS, MAP_SORTS, type MapPeriodKey, type MapSortKey } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thư viện bản đồ Craftland",
  description: "Tìm bản đồ Craftland Free Fire theo tên, mã map, creator, thể loại và độ phổ biến.",
  alternates: { canonical: `${siteConfig.url}${CRAFTLAND_MAPS}` },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CraftlandMapsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 60);
  const category = one(sp.category);
  const sortRaw = one(sp.sort);
  const sort = (MAP_SORTS.some((s) => s.key === sortRaw) ? sortRaw : "newest") as MapSortKey;
  const periodRaw = one(sp.period);
  const period = (MAP_PERIODS.some((p) => p.key === periodRaw) ? periodRaw : "all") as MapPeriodKey;
  const platformRaw = one(sp.platform);
  const platform = platformRaw === "mobile" || platformRaw === "pc" ? platformRaw : undefined;
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));
  const view = one(sp.view) === "list" ? "list" : "grid";

  const [categories, { items, total }] = await Promise.all([
    getCategories(),
    listPublishedMaps({ q, category, sort, period, platform, page }),
  ]);
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          {activeCategory ? `Bản đồ ${activeCategory.name}` : "Thư viện bản đồ Craftland"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lượt xem là số lần mở trang trên ArexNetwork, không phải lượt chơi trong game.
        </p>
      </header>

      <Suspense>
        <MapFilters categories={categories} />
      </Suspense>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total > 0 ? `${new Intl.NumberFormat("vi-VN").format(total)} bản đồ` : null}
        {q ? ` cho “${q}”` : null}
      </p>

      <MapGrid
        maps={items}
        categories={categories}
        layout={view}
        empty={q || category || period !== "all" || platform ? "Không có bản đồ khớp bộ lọc. Thử bỏ bớt điều kiện." : "Chưa có bản đồ nào được xuất bản."}
      />

      <Pagination
        page={page}
        total={total}
        pageSize={MAP_PAGE_SIZE}
        basePath={CRAFTLAND_MAPS}
        params={{ q, category, sort: sort === "newest" ? undefined : sort, period: period === "all" ? undefined : period, platform, view: view === "list" ? "list" : undefined }}
      />
    </div>
  );
}
