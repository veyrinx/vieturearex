import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Swords } from "lucide-react";
import { getTmsTournamentById, getTmsRegistrations, getTmsMatches } from "@/lib/tms/data";
import { TournamentForm } from "@/components/admin/tms/tournament-form";
import { RegistrationsPanel } from "@/components/admin/tms/registrations-panel";
import { MatchesPanel } from "@/components/admin/tms/matches-panel";
import { SubmissionsPanel } from "@/components/admin/tms/submissions-panel";

export const metadata: Metadata = { title: "Quản Lý Giải Đấu" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, registrations, matches] = await Promise.all([
    getTmsTournamentById(id),
    getTmsRegistrations(id).catch(() => []),
    getTmsMatches(id).catch(() => []),
  ]);

  if (!tournament) notFound();

  const approvedTeams = registrations.filter((r) => r.status === "approved").map((r) => r.team!).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] flex items-center gap-2">
            <Swords className="size-5 text-amber-400" /> {tournament.name}
          </h1>
          <Link href={`/tournaments/${tournament.slug}`} target="_blank"
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            /tournaments/{tournament.slug} ↗
          </Link>
        </div>
      </div>

      <TournamentForm tournament={tournament} />
      <RegistrationsPanel tournamentId={id} initialRegistrations={registrations} />
      <MatchesPanel tournamentId={id} initialMatches={matches} approvedTeams={approvedTeams} />
      <SubmissionsPanel tournamentId={id} />
    </div>
  );
}
