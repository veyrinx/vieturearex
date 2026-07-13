import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs, type Crumb } from "@/components/common/breadcrumbs";
import { siteConfig } from "@/lib/constants/site";
import { getWeaponBySlug, getRelatedWeapons, getWeaponStatMaxes, getLoadoutsForWeapon, getTierColor } from "@/lib/data/ff-data";
import { cn } from "@/lib/utils";
import { weaponTypeLabel, attachmentSlotLabel, playstyleLabel } from "@/lib/constants/weapon-types";
import { ItemInteractions } from "@/components/ff-items/item-interactions";
import { Gauge, Box, Calendar, Crosshair, Tag, TrendingUp, TrendingDown, Minus } from "lucide-react";

const TIER_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const weapon = await getWeaponBySlug(slug);
  if (!weapon) return { title: "Không tìm thấy" };

  const title = `Vũ khí ${weapon.name} - Chỉ số & Thông tin chi tiết`;
  const description = `Thông tin chi tiết về chỉ số (sát thương, tầm bắn, tốc độ bắn...) và vị trí trong meta của vũ khí ${weapon.name} trong Free Fire.`;

  return {
    title,
    description,
    openGraph: { title, description, images: [weapon.image_url] },
  };
}

export default async function WeaponDetailPage({ params }: Props) {
  const { slug } = await params;
  const weapon = await getWeaponBySlug(slug);
  if (!weapon) notFound();

  const [statMax, related, loadouts] = await Promise.all([
    getWeaponStatMaxes(),
    getRelatedWeapons(weapon.weapon_type, weapon.id),
    getLoadoutsForWeapon(weapon.id),
  ]);

  const barStats = [
    { label: "Sát thương", value: weapon.damage, max: statMax.damage },
    { label: "Tầm bắn", value: weapon.range, max: statMax.range },
    { label: "Tốc độ bắn", value: weapon.rate_of_fire, max: statMax.rate_of_fire },
  ];

  const metaStats: Array<{ label: string; value: React.ReactNode; icon: typeof Crosshair; href?: string }> = [
    { label: "Thể loại", value: weaponTypeLabel(weapon.weapon_type), icon: Crosshair, href: weapon.weapon_type ? `/vu-khi/loai/${weapon.weapon_type}` : undefined },
    { label: "Phiên bản OB", value: weapon.ob, icon: Tag },
    { label: "Tốc độ thay đạn", value: weapon.reload, icon: Gauge },
    { label: "Băng đạn", value: weapon.magazine, icon: Box },
    { label: "Ngày ra mắt", value: weapon.released_at ? new Date(weapon.released_at).toLocaleDateString("vi-VN") : "N/A", icon: Calendar },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: weapon.name,
    image: weapon.image_url,
    description: weapon.description || `Chỉ số và thông tin vũ khí ${weapon.name} trong Free Fire.`,
    category: weaponTypeLabel(weapon.weapon_type) || "Vũ khí Free Fire",
    url: `${siteConfig.url}/vu-khi/${weapon.slug}`,
    ...(weapon.ratings.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: weapon.ratings.average.toFixed(1),
        ratingCount: weapon.ratings.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const typeLabel = weaponTypeLabel(weapon.weapon_type);
  const crumbs: Crumb[] = [{ name: "Vũ khí", href: "/vu-khi" }];
  if (typeLabel && weapon.weapon_type) crumbs.push({ name: typeLabel, href: `/vu-khi/loai/${weapon.weapon_type}` });
  crumbs.push({ name: weapon.name, href: `/vu-khi/${weapon.slug}` });

  return (
    <main className="container-main my-8 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={crumbs} />
      {/* Header */}
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <Image
          src={weapon.image_url}
          alt={weapon.name}
          width={128}
          height={128}
          className="size-32 rounded-3xl border border-border bg-muted/40 object-contain p-2"
          priority
        />
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl">
            {weapon.name}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{weapon.description || "Chưa có mô tả."}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        {/* Left: Stats */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-5 font-heading text-lg font-bold uppercase tracking-wider">Chỉ số cơ bản</h2>

            {/* Thanh chỉ số chiến đấu */}
            <div className="space-y-4">
              {barStats.map(({ label, value, max }) => {
                const pct = value != null ? Math.min(100, Math.round((value / max) * 100)) : 0;
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">{label}</span>
                      <span className="font-bold text-foreground">{value ?? "N/A"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thông tin khác */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
              {metaStats.map(({ label, value, icon: Icon, href }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                    {href && value ? (
                      <Link href={href} className="text-sm font-bold text-foreground transition-colors hover:text-primary">
                        {value}
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-foreground">{value ?? "N/A"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phụ kiện gợi ý */}
          {weapon.attachments && weapon.attachments.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wider">Phụ kiện gợi ý</h2>
              <div className="space-y-2">
                {weapon.attachments.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                      {attachmentSlotLabel(a.slot) ?? a.slot}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tier history */}
        <div className="space-y-4">
          <SectionHeading title="Lịch sử tier" eyebrow="Meta qua các OB" align="left" />
          {weapon.tier_lists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">Chưa xuất hiện trong tier list nào.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weapon.tier_lists.map((tl, i) => {
                // Mảng đã sắp xếp patch mới → cũ; so với entry cũ hơn liền sau.
                const older = weapon.tier_lists[i + 1];
                const diff = older ? (TIER_RANK[tl.tier] ?? 0) - (TIER_RANK[older.tier] ?? 0) : 0;
                const Trend = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
                const trendColor = diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-muted-foreground";
                return (
                  <div key={tl.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-base font-black text-background",
                      getTierColor(tl.tier).color,
                      getTierColor(tl.tier).shadow,
                    )}>
                      {tl.tier}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">OB{tl.patch}</p>
                      <p className="text-xs text-muted-foreground">Cập nhật {new Date(tl.updated_at).toLocaleDateString("vi-VN")}</p>
                    </div>
                    {older && (
                      <Trend className={cn("size-4 shrink-0", trendColor)} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Loadouts using this weapon */}
      {loadouts.length > 0 && (
        <section className="space-y-4">
          <SectionHeading title="Combo dùng khẩu này" eyebrow="Gợi ý phối" align="left" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadouts.map((l) => (
              <Link
                key={l.id}
                href={`/vu-khi/loadout/${l.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
              >
                <div className="flex -space-x-2">
                  {[l.primary_weapon, l.secondary_weapon].filter(Boolean).map((w, i) => (
                    <div key={i} className="size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                      <Image src={w!.image_url} alt={w!.name} width={44} height={44} className="size-full object-contain p-1" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-foreground">{l.name}</p>
                  {playstyleLabel(l.playstyle) && (
                    <p className="truncate text-xs text-muted-foreground">{playstyleLabel(l.playstyle)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related weapons (same type) */}
      {related.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            title={weaponTypeLabel(weapon.weapon_type) || "Vũ khí liên quan"}
            eyebrow="Cùng thể loại"
            align="left"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((w) => (
              <Link
                key={w.id}
                href={`/vu-khi/${w.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
              >
                <div className="mx-auto flex size-16 items-center justify-center rounded-xl bg-muted/40">
                  <Image
                    src={w.image_url}
                    alt={w.name}
                    width={64}
                    height={64}
                    className="size-full object-contain p-1 transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 truncate text-center text-xs font-bold uppercase tracking-wide text-foreground">
                  {w.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Interactions: Ratings & Comments */}
      <ItemInteractions
        itemId={weapon.id}
        initialRatings={weapon.ratings}
        initialComments={weapon.comments}
      />
    </main>
  );
}
