/* eslint-disable @next/next/no-img-element -- ảnh do creator tải lên (Supabase/ImageKit) */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, ExternalLink, Info, Monitor, RefreshCw, Smartphone, UserRound } from "lucide-react";
import { MapGrid } from "@/components/craftland/map-card";
import { CopyCodeButton, GuideToggle, MapEngagement, MapViewTracker } from "@/components/craftland/map-interactions";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import { getCategories, getCreatorByUserId, getPublishedMapBySlug, getRelatedMaps } from "@/lib/server/craftland";
import { CRAFTLAND_MAPS, METRIC_EXPLAINERS, PLATFORM_LABELS, craftlandCreatorHref, craftlandMapHref } from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const nf = new Intl.NumberFormat("vi-VN");

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m?.[1] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const map = await getPublishedMapBySlug(slug).catch(() => null);
  if (!map) return { title: "Bản đồ Craftland" };
  const url = `${siteConfig.url}${craftlandMapHref(slug)}`;
  return {
    title: `${map.title} — Bản đồ Craftland`,
    description: map.summary || undefined,
    alternates: { canonical: url },
    openGraph: { title: map.title, description: map.summary || undefined, url, type: "article", images: map.cover_url ? [map.cover_url] : undefined },
  };
}

export default async function CraftlandMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const map = await getPublishedMapBySlug(slug).catch(() => null);
  if (!map) notFound();

  const [creator, categories, related] = await Promise.all([
    getCreatorByUserId(map.creator_id),
    getCategories(),
    getRelatedMaps(map),
  ]);
  const category = categories.find((c) => c.slug === map.category_slug);
  const ytId = youtubeId(map.video_url);
  const creatorVisible = creator?.status === "active";

  return (
    <article className="space-y-10">
      <MapViewTracker mapId={map.id} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href={CRAFTLAND_MAPS} className="hover:text-foreground">Thư viện</Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`${CRAFTLAND_MAPS}?category=${category.slug}`} className="hover:text-foreground">{category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Cột chính */}
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            {map.cover_url ? (
              <img src={map.cover_url} alt={`Ảnh bản đồ ${map.title}`} className="aspect-video w-full object-cover" />
            ) : (
              <div className="aspect-video" />
            )}
          </div>

          {map.gallery.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Thư viện ảnh">
              {map.gallery.map((src, i) => (
                <li key={src}>
                  <a href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border">
                    <img src={src} alt={`Ảnh ${i + 1} của ${map.title}`} loading="lazy" className="aspect-video w-full object-cover transition hover:scale-105" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <header className="space-y-2">
            <h1 className="font-heading text-2xl font-extrabold leading-tight text-foreground md:text-3xl">{map.title}</h1>
            {map.summary && <p className="text-base text-muted-foreground">{map.summary}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {category && <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{category.name}</span>}
              {map.tags.map((t) => (
                <Link key={t} href={`${CRAFTLAND_MAPS}?q=${encodeURIComponent(t)}`} className="rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground">
                  #{t}
                </Link>
              ))}
            </div>
          </header>

          {map.description && (
            <section className="space-y-2">
              <h2 className="font-heading text-lg font-bold">Giới thiệu</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{map.description}</p>
            </section>
          )}

          {(ytId || map.video_url) && (
            <section className="space-y-2">
              <h2 className="font-heading text-lg font-bold">Video gameplay</h2>
              {ytId ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                    title={`Video gameplay ${map.title}`}
                    loading="lazy"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                </div>
              ) : (
                <a href={map.video_url!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  Xem video gameplay <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
            </section>
          )}
        </div>

        {/* Cột phụ */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            {map.map_code ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Mã map (do creator cung cấp)</div>
                <div className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-wide text-foreground">{map.map_code}</div>
                <div className="mt-3"><CopyCodeButton mapId={map.id} code={map.map_code} /></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Creator chưa cung cấp mã map.</p>
            )}

            <GuideToggle mapId={map.id}>
              {map.how_to_play ? (
                <p className="whitespace-pre-line">{map.how_to_play}</p>
              ) : (
                <p>
                  Mở Free Fire → vào mục Craftland → chọn tìm kiếm bản đồ và nhập mã ở trên. Giao diện trong game có thể thay đổi theo phiên bản; nếu mã không hoạt động, hãy bấm “Báo cáo” để đội ngũ kiểm tra.
                </p>
              )}
            </GuideToggle>

            {map.platforms_verified && map.platforms.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Nền tảng đã xác nhận:</span>
                {map.platforms.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                    {p === "pc" ? <Monitor className="size-3.5" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />}
                    {PLATFORM_LABELS[p]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <MapEngagement
              mapId={map.id}
              title={map.title}
              initialFavorites={map.favorite_count}
              initialRatingCount={map.rating_count}
              initialRatingSum={map.rating_sum}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 text-sm">
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" aria-hidden /> Lượt xem web
                <span title={METRIC_EXPLAINERS.views}><Info className="size-3.5" aria-label={METRIC_EXPLAINERS.views} /></span>
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{nf.format(map.view_count)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lượt chia sẻ</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{nf.format(map.share_count)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden /> Xuất bản</dt>
              <dd className="mt-0.5 font-semibold">{map.published_at ? dateFmt.format(new Date(map.published_at)) : "—"}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="size-3.5" aria-hidden /> Cập nhật</dt>
              <dd className="mt-0.5 font-semibold">{dateFmt.format(new Date(map.updated_at))}</dd>
            </div>
          </dl>

          {creator && creatorVisible && (
            <Link href={craftlandCreatorHref(creator.username)} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-muted"><UserRound className="size-5 text-muted-foreground" aria-hidden /></span>
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <span className="truncate">{creator.display_name}</span>
                  {creator.verification_status === "verified" && <VerifiedBadge />}
                </span>
                <span className="block text-xs text-muted-foreground">@{creator.username}</span>
              </span>
            </Link>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold">Bản đồ liên quan</h2>
          <MapGrid maps={related} categories={categories} />
        </section>
      )}
    </article>
  );
}
