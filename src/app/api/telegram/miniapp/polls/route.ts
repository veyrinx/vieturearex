import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type RawPoll = {
  id: string;
  question: string;
  status: string;
  ends_at: string | null;
  poll_options: { id: string; label: string; display_order: number }[];
};

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-polls", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ polls: [] });

  // Resolve TG user (optional — guests can view, but won't know their vote)
  const auth = await resolveTgUser(req);
  const tgUserId = auth.ok ? auth.user.id : null;

  const { data: polls } = (await untypedFrom(db, "polls")
    .select("id, question, status, ends_at, poll_options(id, label, display_order)")
    .eq("status", "active")
    .eq("entity_type", "global")
    .order("created_at", { ascending: false })
    .limit(20)) as { data: RawPoll[] | null };

  if (!polls?.length) return NextResponse.json({ polls: [] });

  const pollIds = polls.map((p) => p.id);

  // Site votes
  const { data: siteVotes } = (await untypedFrom(db, "poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds)) as { data: { poll_id: string; option_id: string }[] | null };

  // TG votes
  const { data: tgVotes } = (await untypedFrom(db, "tg_poll_votes")
    .select("poll_id, option_id, tg_user_id")
    .in("poll_id", pollIds)) as { data: { poll_id: string; option_id: string; tg_user_id: number }[] | null };

  // Count combined votes per option
  const counts: Record<string, number> = {};
  for (const v of [...(siteVotes ?? []), ...(tgVotes ?? [])]) {
    counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
  }

  // Find this TG user's votes
  const myVotes: Record<string, string> = {};
  if (tgUserId) {
    for (const v of tgVotes ?? []) {
      if (v.tg_user_id === tgUserId) myVotes[v.poll_id] = v.option_id;
    }
  }

  const enriched = polls.map((poll) => {
    const options = poll.poll_options
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    const totalVotes = options.reduce((s, o) => s + (counts[o.id] ?? 0), 0);
    return {
      id: poll.id,
      question: poll.question,
      ends_at: poll.ends_at,
      myVote: myVotes[poll.id] ?? null,
      options: options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: counts[o.id] ?? 0,
        percent: totalVotes > 0 ? Math.round(((counts[o.id] ?? 0) / totalVotes) * 100) : 0,
      })),
      totalVotes,
    };
  });

  return NextResponse.json({ polls: enriched });
}
