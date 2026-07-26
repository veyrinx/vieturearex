import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Flame, Newspaper, CalendarClock, Swords, UserRound } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getNews, getEvents } from "@/lib/data/content-service";
import { getAllWeapons } from "@/lib/data/ff-data";
import { getAllCharacters } from "@/lib/data/ff-characters";
import { weaponTypeLabel } from "@/lib/constants/weapon-types";

export const metadata: Metadata = {
  title: "Đang hot — Tin, sự kiện & meta Free Fire",
  description:
    "Tổng hợp đang hot Free Fire: tin mới nhất, sự kiện đang diễn ra, vũ khí và nhân vật mạnh nhất (tier S) trong meta.",
  alternates: { canonical: `${siteConfig.url}/dang-hot` },
  openGraph: {
    title: "Đang hot — Tin, sự kiện & meta Free Fire | Arex",
    description: "Tổng hợp đang hot Free Fire: tin mới nhất, sự kiện đang diễn ra, vũ khí và nhân vật mạnh nhất (tier S) trong meta.",
    url: `${siteConfig.url}/dang-hot`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export const revalidate = 600;

function Section({ icon: Icon, title, children }: { icon: typeof Flame; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold uppercase tracking-wide text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DangHotPage() {
  const [news, events, weapons, characters] = await Promise.all([
    getNews("published", { includeContent: false }).catch(() => []),
    getEvents().catch(() => []),
    getAllWeapons().catch(() => []),
    Promise.resolve(getAllCharacters()),
  ]);

  const topNews = news.slice(0, 4);
  const activeEvents = events.filter((e) => e.status === "active" || e.status === "upcoming").slice(0, 4);
  const sWeapons = weapons.filter((w) => w.tier === "S").slice(0, 6);
  const sChars = characters.filter((c) => c.tier === "S").slice(0, 6);

  return (
    <main className="container-main my-8 max-w-3xl space-y-10">
      <Breadcrumbs items={[{ name: "Đang hot", href: "/dang-hot" }]} />

      <PageHero
        icon={Flame}
        eyebrow="Nổi bật ngay bây giờ"
        title="Đang hot"
        subtitle="Tin mới, sự kiện đang diễn ra và meta mạnh nhất — gom một chỗ."
      />

      {topNews.length > 0 && (
        <Section icon={Newspaper} title="Tin nóng">
          <div className="grid gap-3 sm:grid-cols-2">
            {topNews.map((n) => (
              <Link key={n.slug} href={`/tin-tuc/${n.slug}`} className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50">
                {n.cover && (
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted/40">
                    <Image src={n.cover} alt={n.title} width={64} height={64} className="size-full object-cover" />
                  </div>
                )}
                <p className="line-clamp-3 text-sm font-semibold text-foreground group-hover:text-primary">{n.title}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {activeEvents.length > 0 && (
        <Section icon={CalendarClock} title="Sự kiện đang diễn ra">
          <div className="space-y-2">
            {activeEvents.map((e) => (
              <Link key={e.id} href={`/su-kien/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50">
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${e.status === "active" ? "bg-emerald-500/12 text-emerald-500" : "bg-blue-500/12 text-blue-500"}`}>
                  {e.status === "active" ? "Đang diễn ra" : "Sắp tới"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{e.title}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {sWeapons.length > 0 && (
        <Section icon={Swords} title="Vũ khí meta (tier S)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sWeapons.map((w) => (
              <Link key={w.id} href={`/vu-khi/${w.slug}`} className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-2 transition-colors hover:border-primary/50">
                <div className="flex size-14 items-center justify-center rounded-xl bg-muted/40">
                  <Image src={w.image_url} alt={w.name} width={56} height={56} className="size-full object-contain p-1" />
                </div>
                <p className="truncate text-center text-[11px] font-bold uppercase text-foreground">{w.name}</p>
                {weaponTypeLabel(w.weapon_type) && <p className="truncate text-[9px] text-muted-foreground">{weaponTypeLabel(w.weapon_type)}</p>}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {sChars.length > 0 && (
        <Section icon={UserRound} title="Nhân vật meta (tier S)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sChars.map((c) => (
              <Link key={c.slug} href={`/nhan-vat/${c.slug}`} className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-2 transition-colors hover:border-primary/50">
                <div className="size-14 overflow-hidden rounded-xl bg-muted/40">
                  {c.image ? (
                    <Image src={c.image} alt={c.name} width={56} height={56} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-lg font-black text-muted-foreground">{c.name.slice(0, 1)}</div>
                  )}
                </div>
                <p className="truncate text-center text-[11px] font-bold uppercase text-foreground">{c.name}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
