/* eslint-disable @next/next/no-img-element -- ảnh creator tự tải lên (Supabase/ImageKit) */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, Trophy, UserRound } from "lucide-react";
import { DailyAreaChart } from "@/components/craftland/charts";
import { StatTile } from "@/components/craftland/stats";
import { MapGrid } from "@/components/craftland/map-card";
import { FollowButton } from "@/components/craftland/map-interactions";
import { Pagination } from "@/components/craftland/pagination";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import {
  getCategories, getDailyRows, getPublicCreator, listPublishedMaps, seriesByDay, tbl, vnDayOffset,
} from "@/lib/server/craftland";
import { METRIC_EXPLAINERS, VERIFIED_BADGE_DISCLAIMER, craftlandCreatorHref, craftlandMapHref } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("vi-VN");
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const creator = await getPublicCreator(username).catch(() => null);
  if (!creator) return { title: "Creator Craftland" };
  return {
    title: `${creator.display_name} (@${creator.username}) — Creator Craftland`,
    description: creator.bio.slice(0, 160) || undefined,
    alternates: { canonical: `${siteConfig.url}${craftlandCreatorHref(creator.username)}` },
  };
}

export default async function CreatorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const creator = await getPublicCreator(username).catch(() => null);
  if (!creator) notFound();

  const from = vnDayOffset(89);
  const to = vnDayOffset(0);
  const [{ items, total }, categories, allMapsRes] = await Promise.all([
    listPublishedMaps({ creatorId: creator.user_id, page, pageSize: PAGE_SIZE }),
    getCategories(),
    tbl("craftland_maps")
      .select("id, slug, title, view_count, favorite_count, share_count, copy_count, rating_count")
      .eq("creator_id", creator.user_id)
      .eq("status", "published") as unknown as Promise<{
      data: Array<{ id: string; slug: string; title: string; view_count: number; favorite_count: number; share_count: number; copy_count: number; rating_count: number }> | null;
    }>,
  ]);
  const allMaps = allMapsRes.data ?? [];
  const daily = await getDailyRows(allMaps.map((m) => m.id), from, to);
  const series = seriesByDay(daily, from, to);

  const totals = allMaps.reduce(
    (a, m) => ({
      views: a.views + m.view_count,
      favorites: a.favorites + m.favorite_count,
      shares: a.shares + m.share_count,
      interactions: a.interactions + m.copy_count + m.rating_count + m.favorite_count + m.share_count,
    }),
    { views: 0, favorites: 0, shares: 0, interactions: 0 },
  );
  const best = [...allMaps].sort((a, b) => b.view_count - a.view_count)[0];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 bg-muted md:h-48">
          {creator.cover_url && <img src={creator.cover_url} alt="" className="size-full object-cover" />}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 md:flex-row md:items-end md:px-8">
          <div className="-mt-10 shrink-0">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="size-20 rounded-full border-4 border-card object-cover md:size-24" />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full border-4 border-card bg-muted md:size-24">
                <UserRound className="size-8 text-muted-foreground" aria-hidden />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-2xl font-extrabold text-foreground">
              {creator.display_name}
              {creator.verification_status === "verified" && <VerifiedBadge withLabel />}
            </h1>
            <p className="text-sm text-muted-foreground">@{creator.username}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              Tham gia {new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date(creator.created_at))}
            </p>
          </div>
          <FollowButton creatorId={creator.user_id} initialFollowers={creator.follower_count} />
        </div>
        {(creator.bio || creator.social_links.length > 0) && (
          <div className="space-y-3 border-t border-border px-5 py-4 md:px-8">
            {creator.bio && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{creator.bio}</p>}
            {creator.social_links.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {creator.social_links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary/40">
                      {l.label} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {creator.verification_status === "verified" && <p className="text-xs text-muted-foreground">{VERIFIED_BADGE_DISCLAIMER}</p>}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Lượt xem trên ArexNetwork" value={nf.format(totals.views)} hint={METRIC_EXPLAINERS.views} />
        <StatTile label="Lượt lưu" value={nf.format(totals.favorites)} hint={METRIC_EXPLAINERS.favorites} />
        <StatTile label="Lượt chia sẻ" value={nf.format(totals.shares)} hint={METRIC_EXPLAINERS.shares} />
        <StatTile label="Tổng tương tác" value={nf.format(totals.interactions)} hint="Sao chép mã + đánh giá + lưu + chia sẻ trên ArexNetwork." />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Lượt xem trên ArexNetwork — 90 ngày</h2>
          <DailyAreaChart data={series} dataKey="views" label="Lượt xem" />
        </div>
        {best && best.view_count > 0 && (
          <Link href={craftlandMapHref(best.slug)} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Trophy className="size-4 text-amber-500" aria-hidden /> Bản đồ nhiều lượt xem nhất
            </span>
            <span className="mt-3 font-heading text-lg font-bold">{best.title}</span>
            <span className="mt-2 text-sm text-muted-foreground">{nf.format(best.view_count)} lượt xem web</span>
          </Link>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">Bản đồ đã xuất bản ({total})</h2>
        <MapGrid maps={items} categories={categories} empty="Creator chưa có bản đồ nào được xuất bản." />
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath={craftlandCreatorHref(creator.username)} params={{}} />
      </section>
    </div>
  );
}
