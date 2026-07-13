import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Plus, Layers } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { getLoadoutBySlug, type LoadoutWeaponFull } from "@/lib/data/ff-data";
import { playstyleLabel, weaponTypeLabel } from "@/lib/constants/weapon-types";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

const STAT_ROWS: { key: keyof NonNullable<LoadoutWeaponFull>; label: string }[] = [
  { key: "damage", label: "Sát thương" },
  { key: "range", label: "Tầm bắn" },
  { key: "rate_of_fire", label: "Tốc độ bắn" },
  { key: "reload", label: "Tốc độ thay đạn" },
  { key: "magazine", label: "Băng đạn" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loadout = await getLoadoutBySlug(slug);
  if (!loadout) return { title: "Không tìm thấy" };

  const title = `Combo ${loadout.name} — Loadout Free Fire`;
  const description =
    loadout.description ||
    `Bộ combo vũ khí ${loadout.name} trong Free Fire${playstyleLabel(loadout.playstyle) ? ` — lối chơi ${playstyleLabel(loadout.playstyle)}` : ""}.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/vu-khi/loadout/${loadout.slug}` },
    openGraph: { title, description, images: loadout.image_url ? [loadout.image_url] : undefined },
  };
}

function WeaponCard({ weapon }: { weapon: LoadoutWeaponFull }) {
  if (!weapon) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
          <Layers className="size-8" />
        </div>
        <p className="text-sm text-muted-foreground">Trống</p>
      </div>
    );
  }
  return (
    <Link
      href={`/vu-khi/${weapon.slug}`}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/50"
    >
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/40">
        <Image src={weapon.image_url} alt={weapon.name} width={80} height={80} className="size-full object-contain p-1 transition-transform group-hover:scale-105" />
      </div>
      <p className="font-heading text-base font-bold uppercase tracking-wide text-foreground">{weapon.name}</p>
      {weaponTypeLabel(weapon.weapon_type) && (
        <p className="text-xs text-muted-foreground">{weaponTypeLabel(weapon.weapon_type)}</p>
      )}
    </Link>
  );
}

export default async function LoadoutDetailPage({ params }: Props) {
  const { slug } = await params;
  const loadout = await getLoadoutBySlug(slug);
  if (!loadout) notFound();

  const a = loadout.primary_weapon;
  const b = loadout.secondary_weapon;
  const showStats = !!a && !!b;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: loadout.name,
    description: loadout.description || undefined,
    url: `${siteConfig.url}/vu-khi/loadout/${loadout.slug}`,
    itemListElement: [a, b].filter(Boolean).map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w!.name,
      url: `${siteConfig.url}/vu-khi/${w!.slug}`,
    })),
  };

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link
        href="/vu-khi/loadout"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tất cả combo
      </Link>

      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl">
          {loadout.name}
        </h1>
        {playstyleLabel(loadout.playstyle) && (
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {playstyleLabel(loadout.playstyle)}
          </span>
        )}
        {loadout.description && (
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">{loadout.description}</p>
        )}
      </div>

      {/* Weapons */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <WeaponCard weapon={a} />
        <Plus className="size-5 shrink-0 text-muted-foreground" />
        <WeaponCard weapon={b} />
      </div>

      {/* Stat comparison */}
      {showStats && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {STAT_ROWS.map(({ key, label }, idx) => {
            const rawA = a![key];
            const rawB = b![key];
            const numA = typeof rawA === "number" ? rawA : null;
            const numB = typeof rawB === "number" ? rawB : null;
            const aWins = numA != null && numB != null && numA > numB;
            const bWins = numA != null && numB != null && numB > numA;
            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3",
                  idx % 2 === 0 ? "bg-muted/30" : "",
                )}
              >
                <div className={cn("text-right text-sm font-bold tabular-nums", aWins ? "text-primary" : "text-muted-foreground")}>
                  {numA ?? "—"}
                </div>
                <div className="min-w-[110px] text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className={cn("text-left text-sm font-bold tabular-nums", bWins ? "text-primary" : "text-muted-foreground")}>
                  {numB ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
