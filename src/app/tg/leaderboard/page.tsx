import { getGlobalPlayerLeaderboard } from "@/lib/tms/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { LeaderboardTabs, type NickRow, type QuizRow } from "./_tabs";

/** BXH nick khủng VN — tự chấm điểm từ dữ liệu thật khi có người tra cứu. */
async function getNicks(): Promise<NickRow[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "ff_auto_scores")
      .select("ff_id, nickname, level, likes, br_rank_point, score")
      .eq("region", "VN")
      .order("score", { ascending: false })
      .limit(20)) as { data: NickRow[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

async function getQuizzes(): Promise<QuizRow[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "quiz_scores")
      .select("best_score, best_total, plays, users(display_name, avatar_url)")
      .order("best_score", { ascending: false })
      .limit(20)) as {
      data: Array<{ best_score: number; best_total: number; plays: number; users: { display_name: string | null; avatar_url: string | null } | null }> | null;
    };
    return (data ?? []).map((r) => ({
      display_name: r.users?.display_name ?? null,
      avatar_url: r.users?.avatar_url ?? null,
      best_score: r.best_score,
      best_total: r.best_total,
      plays: r.plays,
    }));
  } catch {
    return [];
  }
}

export default async function TgLeaderboardPage() {
  const [players, nicks, quizzes] = await Promise.all([
    getGlobalPlayerLeaderboard(20).catch(() => []),
    getNicks(),
    getQuizzes(),
  ]);

  return (
    <div className="flex flex-col gap-3 p-4 pb-20">
      <h1 className="text-base font-bold">🏆 Bảng Xếp Hạng</h1>
      <LeaderboardTabs players={players} nicks={nicks} quizzes={quizzes} />
    </div>
  );
}
