import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { getTmsTournament } from "@/lib/tms/data";
import { siteConfig } from "@/lib/constants/site";
import { LiveBoard } from "@/components/tms/live-board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTmsTournament(slug).catch(() => null);
  const title = t ? `${t.name} — Xem trực tiếp` : "Xem giải trực tiếp";
  const description = t
    ? `Theo dõi trực tiếp giải ${t.name}: trận đang đá, lịch trận sắp tới, kết quả vừa xong và bảng xếp hạng đội.`
    : undefined;
  const url = `${siteConfig.url}/tournaments/${slug}/live`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: siteConfig.name },
  };
}

export default async function TournamentLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getTmsTournament(slug).catch(() => null);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/tournaments/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {tournament.name}
        </Link>
        <Link
          href={`/tournaments/${slug}/leaderboard`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/40"
        >
          <BarChart2 className="size-3.5" /> Bảng xếp hạng đầy đủ
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Trực tiếp</p>
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
          {tournament.name}
        </h1>
      </div>

      <LiveBoard slug={slug} />
    </div>
  );
}
