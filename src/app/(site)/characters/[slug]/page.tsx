import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Zap, Circle, Vote, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { cn } from "@/lib/utils";
import {
  getAllCharacters,
  getCharacterBySlug,
  splitSkill,
  ROLE_META,
  TIER_META,
} from "@/lib/data/ff-characters";
import { getCharacterVotes } from "@/lib/data/character-votes";

type Props = { params: Promise<{ slug: string }> };

const TIER_BG: Record<string, string> = {
  S: "bg-[#ff7f7f]",
  A: "bg-[#ffbf7f]",
  B: "bg-[#ffff7f]",
  C: "bg-[#7fff7f]",
  D: "bg-[#7fbfff]",
};

export function generateStaticParams() {
  return getAllCharacters().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const char = getCharacterBySlug(slug);
  if (!char) return { title: "Không tìm thấy" };

  const skill = splitSkill(char.skill);
  const title = `${char.name} Free Fire — Kỹ năng ${skill.name} & Tier`;
  const description = `Nhân vật ${char.name} (${ROLE_META[char.role].label}, tier ${char.tier}) trong Free Fire: kỹ năng ${skill.name} — ${skill.desc}`;

  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.url}/characters/${char.slug}` },
    openGraph: { title, description, images: char.image ? [char.image] : undefined },
  };
}

export default async function CharacterDetailPage({ params }: Props) {
  const { slug } = await params;
  const char = getCharacterBySlug(slug);
  if (!char) notFound();

  const skill = splitSkill(char.skill);
  const all = getAllCharacters();
  const related = all
    .filter((c) => c.role === char.role && c.slug !== char.slug)
    .slice(0, 6);

  // Bản thức tỉnh <-> bản gốc: nối hai chiều để người xem nhảy qua lại được.
  const awakenedBase = char.awakenedOf ? all.find((c) => c.name === char.awakenedOf) ?? null : null;
  const awakenedForm = all.find((c) => c.awakenedOf === char.name) ?? null;

  const votes = await getCharacterVotes();
  const vote = votes.bySlug[char.slug] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${char.name} — Nhân vật Free Fire`,
    description: `${skill.name}: ${skill.desc}`,
    image: char.image || undefined,
    url: `${siteConfig.url}/characters/${char.slug}`,
  };

  return (
    <main className="container-main my-8 space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { name: "Nhân vật", href: "/characters" },
          { name: ROLE_META[char.role].label, href: `/characters/roles/${char.role}` },
          { name: char.name, href: `/characters/${char.slug}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <div className="relative size-32 shrink-0 overflow-hidden rounded-3xl border border-border bg-muted/40">
          <span className={cn(
            "absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-lg text-base font-black text-background",
            TIER_BG[char.tier] ?? "bg-muted",
          )}>
            {char.tier}
          </span>
          {char.image ? (
            <Image src={char.image} alt={char.name} width={128} height={128} className="size-full object-cover" priority />
          ) : (
            <div className="flex size-full items-center justify-center text-5xl font-black text-muted-foreground">
              {char.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl">
            {char.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Link
              href={`/characters/roles/${char.role}`}
              className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase transition-opacity hover:opacity-80", ROLE_META[char.role].bg, ROLE_META[char.role].text)}
            >
              {ROLE_META[char.role].label}
            </Link>
            <span className={cn("rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase", TIER_META[char.tier].text)}>
              Tier {char.tier} · {TIER_META[char.tier].label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              {char.skillType === "active" ? <><Zap className="size-3" /> Chủ động</> : <><Circle className="size-2.5" /> Bị động</>}
            </span>
          </div>
        </div>
      </div>

      {/* Skill */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-2 flex items-center gap-2">
          {char.skillType === "active" ? <Zap className="size-4 text-primary" /> : <Circle className="size-3 text-primary" />}
          <h2 className="font-heading text-lg font-bold uppercase tracking-wider">{skill.name}</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{skill.desc || "Chưa có mô tả."}</p>
      </div>

      {/* Bản thức tỉnh <-> bản gốc */}
      {(awakenedBase || awakenedForm) && (
        <Link
          href={`/characters/${(awakenedBase ?? awakenedForm)!.slug}`}
          className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/60"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted/40">
            {(awakenedBase ?? awakenedForm)!.image ? (
              <Image
                src={(awakenedBase ?? awakenedForm)!.image!}
                alt={(awakenedBase ?? awakenedForm)!.name}
                width={56}
                height={56}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xl font-black text-muted-foreground">
                {(awakenedBase ?? awakenedForm)!.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-3" />
              {awakenedBase ? "Bản gốc" : "Bản thức tỉnh"}
            </p>
            <p className="truncate font-heading text-base font-bold uppercase tracking-wide text-foreground">
              {(awakenedBase ?? awakenedForm)!.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {splitSkill((awakenedBase ?? awakenedForm)!.skill).name}
            </p>
          </div>
        </Link>
      )}

      {/* Bình chọn cộng đồng */}
      {vote && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Vote className="size-4 text-amber-500" />
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider">Cộng đồng chấm</h2>
            </div>
            <Link
              href="/character-poll"
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Bình chọn ngay
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-black text-foreground">{vote.votes.toLocaleString("vi-VN")}</span> phiếu
            {votes.total > 0 && <> · chiếm <span className="font-black text-foreground">{vote.percent}%</span> tổng số phiếu mùa {votes.season}</>}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
              style={{ width: `${Math.min(100, vote.percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="space-y-4">
          <SectionHeading title={`Nhân vật ${ROLE_META[char.role].label} khác`} eyebrow="Cùng vai trò" align="left" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((c) => (
              <Link
                key={c.slug}
                href={`/characters/${c.slug}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/50"
              >
                <div className="relative size-16 overflow-hidden rounded-xl bg-muted/40">
                  <span className={cn(
                    "absolute left-0.5 top-0.5 z-10 flex size-5 items-center justify-center rounded-md text-[11px] font-black text-background",
                    TIER_BG[c.tier] ?? "bg-muted",
                  )}>
                    {c.tier}
                  </span>
                  {c.image ? (
                    <Image src={c.image} alt={c.name} width={64} height={64} className="size-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl font-black text-muted-foreground">{c.name.slice(0, 1)}</div>
                  )}
                </div>
                <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
