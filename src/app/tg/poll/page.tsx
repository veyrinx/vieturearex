import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { PollPageClient } from "./_client";

type RawPoll = {
  id: string;
  question: string;
  status: string;
  ends_at: string | null;
  poll_options: { id: string; label: string; display_order: number }[];
};

async function fetchPolls() {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  const { data } = (await untypedFrom(db, "polls")
    .select("id, question, status, ends_at, poll_options(id, label, display_order)")
    .eq("status", "active")
    .eq("entity_type", "global")
    .order("created_at", { ascending: false })
    .limit(20)) as { data: RawPoll[] | null };

  if (!data?.length) return [];

  const pollIds = data.map((p) => p.id);

  const { data: siteVotes } = (await untypedFrom(db, "poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds)) as { data: { poll_id: string; option_id: string }[] | null };

  const { data: tgVotes } = (await untypedFrom(db, "tg_poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds)) as { data: { poll_id: string; option_id: string }[] | null };

  const counts: Record<string, number> = {};
  for (const v of [...(siteVotes ?? []), ...(tgVotes ?? [])]) {
    counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
  }

  return data.map((poll) => {
    const options = poll.poll_options
      .slice()
      .sort((a, b) => a.display_order - b.display_order);
    const totalVotes = options.reduce((s, o) => s + (counts[o.id] ?? 0), 0);
    return {
      id: poll.id,
      question: poll.question,
      ends_at: poll.ends_at,
      myVote: null as string | null,
      options: options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: counts[o.id] ?? 0,
        percent: totalVotes > 0 ? Math.round(((counts[o.id] ?? 0) / totalVotes) * 100) : 0,
      })),
      totalVotes,
    };
  });
}

export default async function TgPollPage() {
  const polls = await fetchPolls();
  return <PollPageClient polls={polls} />;
}
