import { getGlobalPlayerLeaderboard } from "@/lib/tms/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { LeaderboardTabs, type NickRow } from "./_tabs";

async function getNicks(): Promise<NickRow[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "account_scores")
      .select("ff_id, display_name, avatar_url, score, tier")
      .order("score", { ascending: false })
      .limit(20)) as { data: NickRow[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function TgLeaderboardPage() {
  const [players, nicks] = await Promise.all([
    getGlobalPlayerLeaderboard(20).catch(() => []),
    getNicks(),
  ]);

  return (
    <div className="flex flex-col gap-3 p-4 pb-20">
      <h1 className="text-base font-bold">🏆 Bảng Xếp Hạng</h1>
      <LeaderboardTabs players={players} nicks={nicks} />
    </div>
  );
}
