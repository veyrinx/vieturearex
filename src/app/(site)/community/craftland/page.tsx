/* eslint-disable @next/next/no-img-element -- avatar creator do người dùng tải lên */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Map as MapIcon, Search, Upload, UserRound } from "lucide-react";
import { MapGrid } from "@/components/craftland/map-card";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import { getHubData } from "@/lib/server/craftland";
import { listPublishedArticles } from "@/lib/server/craftland-academy";
import {
  CRAFTLAND_ACADEMY, CRAFTLAND_BASE, CRAFTLAND_MAPS, CRAFTLAND_STUDIO, craftlandAcademyHref, craftlandCreatorHref,
} from "@/lib/constants/craftland";
import { siteConfig } from "@/lib/constants/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Craftland — Thư viện bản đồ Free Fire",
  description: "Khám phá bản đồ Craftland do cộng đồng Free Fire Việt Nam sáng tạo: tìm theo thể loại, mã map, creator và học làm map tại Craftland Academy.",
  alternates: { canonical: `${siteConfig.url}${CRAFTLAND_BASE}` },
};

function Section({ title, href, linkLabel = "Xem tất cả", children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {linkLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function CraftlandHubPage() {
  const [hub, articles] = await Promise.all([getHubData(), listPublishedArticles()]);
  const latestArticles = [...articles]
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 4);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card px-5 py-8 md:px-10 md:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">ArexNetwork Craftland</p>
        <h1 className="mt-2 max-w-2xl font-heading text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
          Thư viện bản đồ Craftland của cộng đồng Free Fire Việt Nam
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Tìm bản đồ theo thể loại hoặc mã map, theo dõi creator yêu thích và học cách tự làm map. Mọi bản đồ đều được đội ngũ kiểm duyệt trước khi xuất bản.
        </p>
        <form action={CRAFTLAND_MAPS} role="search" className="relative mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            name="q"
            type="search"
            maxLength={60}
            placeholder="Tên bản đồ, mã map hoặc creator…"
            aria-label="Tìm bản đồ"
            className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-24 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110">
            Tìm
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          {hub.totalMaps > 0 ? `${new Intl.NumberFormat("vi-VN").format(hub.totalMaps)} bản đồ đã xuất bản` : "Thư viện đang chờ những bản đồ đầu tiên"}
        </p>
      </section>

      {/* Thể loại */}
      {hub.categories.length > 0 && (
        <section aria-label="Thể loại" className="flex flex-wrap gap-2">
          {hub.categories.map((c) => (
            <Link
              key={c.slug}
              href={`${CRAFTLAND_MAPS}?category=${c.slug}`}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </section>
      )}

      {hub.featured.length > 0 && (
        <Section title="Bản đồ nổi bật" href={`${CRAFTLAND_MAPS}?sort=featured`}>
          <MapGrid maps={hub.featured} categories={hub.categories} />
        </Section>
      )}

      <Section title="Đang được quan tâm" href={`${CRAFTLAND_MAPS}?sort=trending`}>
        <MapGrid maps={hub.trending} categories={hub.categories} empty="Chưa có bản đồ nào được xuất bản. Hãy là creator đầu tiên!" />
      </Section>

      {hub.editorPicks.length > 0 && (
        <Section title="Đội ngũ ArexNetwork đề xuất" href={`${CRAFTLAND_MAPS}?sort=editor`}>
          <MapGrid maps={hub.editorPicks} categories={hub.categories} />
        </Section>
      )}

      {hub.newest.length > 0 && (
        <Section title="Bản đồ mới" href={CRAFTLAND_MAPS}>
          <MapGrid maps={hub.newest} categories={hub.categories} />
        </Section>
      )}

      {hub.creators.length > 0 && (
        <Section title="Creator nổi bật">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hub.creators.map((c) => (
              <Link
                key={c.user_id}
                href={craftlandCreatorHref(c.username)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/40"
              >
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRound className="size-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <span className="truncate">{c.display_name}</span>
                    {c.verification_status === "verified" && <VerifiedBadge />}
                  </span>
                  <span className="block text-xs text-muted-foreground">{c.map_count} bản đồ</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Hướng dẫn Craftland mới nhất" href={CRAFTLAND_ACADEMY} linkLabel="Vào Academy">
        {latestArticles.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {latestArticles.map((a) => (
              <Link key={a.id} href={craftlandAcademyHref(a.slug)} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
                <h3 className="font-semibold text-foreground">{a.title}</h3>
                {a.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-8 text-center text-sm text-muted-foreground">
            Đội ngũ đang biên soạn bài hướng dẫn đầu tiên.
          </p>
        )}
      </Section>

      {/* CTA */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Upload className="size-6 text-primary" aria-hidden />
          <h2 className="mt-3 font-heading text-lg font-bold">Bạn đã làm một bản đồ Craftland?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tạo hồ sơ creator, gửi bản đồ để kiểm duyệt và theo dõi lượt xem ngay trong Creator Studio.</p>
          <Link href={CRAFTLAND_STUDIO} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110">
            <MapIcon className="size-4" aria-hidden /> Gửi bản đồ
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <BookOpen className="size-6 text-primary" aria-hidden />
          <h2 className="mt-3 font-heading text-lg font-bold">Mới bắt đầu làm map?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Craftland Academy tổng hợp hướng dẫn tiếng Việt cho Craftland Mobile và Craftland Studio PC.</p>
          <Link href={CRAFTLAND_ACADEMY} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:border-primary/40">
            Bắt đầu học <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
