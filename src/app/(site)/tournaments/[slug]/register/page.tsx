import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTmsTournament } from "@/lib/tms/data";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { RegistrationForm } from "@/components/tms/registration-form";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTmsTournament(slug).catch(() => null);
  return { title: t ? `Đăng ký — ${t.name} | Arex TMS` : "Đăng ký Giải Đấu" };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTeamWithMembers(userId: string) {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data: membership } = await untypedFrom(db, "tms_team_members")
    .select("team:tms_teams(id, name, tag, captain_id, logo_url)")
    .eq("user_id", userId)
    .maybeSingle() as { data: { team: { id: string; name: string; tag: string; captain_id: string; logo_url: string | null } } | null };

  if (!membership?.team) return null;
  const team = membership.team;

  const { data: members } = await untypedFrom(db, "tms_team_members")
    .select("user:users(id, display_name, ff_id, avatar_url)")
    .eq("team_id", team.id) as {
      data: Array<{ user: { id: string; display_name: string | null; ff_id: string | null; avatar_url: string | null } }> | null;
    };

  return { ...team, members: (members ?? []).map((m) => m.user) };
}

async function getExistingRegistration(tournamentId: string, teamId: string) {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data } = await untypedFrom(db, "tms_registrations")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("team_id", teamId)
    .maybeSingle() as { data: { id: string; status: string } | null };
  return data;
}

export default async function TournamentRegisterPage({ params }: PageProps) {
  const { slug } = await params;

  const [tournament, auth] = await Promise.all([
    getTmsTournament(slug).catch(() => null),
    getAuthContext(),
  ]);

  if (!tournament) notFound();
  if (tournament.status !== "registering") redirect(`/tournaments/${slug}`);
  if (!auth.userId) redirect(`/login?next=/tournaments/${slug}/register`);

  const [team, userProfile] = await Promise.all([
    getTeamWithMembers(auth.userId),
    (async () => {
      const db = createAdminSupabaseClient();
      if (!db) return null;
      const { data } = await untypedFrom(db, "users")
        .select("id, email, display_name")
        .eq("id", auth.userId)
        .single() as { data: { id: string; email: string; display_name: string | null } | null };
      return data;
    })(),
  ]);

  const existingReg = team ? await getExistingRegistration(tournament.id, team.id) : null;

  return (
    <div className="py-10 max-w-2xl mx-auto space-y-8">
      <Link
        href={`/tournaments/${slug}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tournament.name}
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em]">
          Đăng Ký Tham Dự
        </h1>
        <p className="text-sm text-muted-foreground">{tournament.name}</p>
      </div>

      <RegistrationForm
        tournament={{
          id: tournament.id,
          name: tournament.name,
          slug: tournament.slug,
          mode: tournament.mode,
          teamSize: tournament.team_size,
          maxTeams: tournament.max_teams,
          prizePool: tournament.prize_pool ?? null,
          registrationCloseAt: tournament.registration_close_at ?? null,
        }}
        team={team}
        userEmail={userProfile?.email ?? auth.email ?? ""}
        existingReg={existingReg}
      />
    </div>
  );
}
