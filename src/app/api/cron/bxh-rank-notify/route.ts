import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { createNotification } from "@/lib/server/notifications";

// Cron — Thông báo khi nick FF của người dùng LÊN HẠNG (hoặc mới lọt Top) trên
// BXH nick khủng VN. So rank hiện tại với lần chạy trước (lưu trong settings,
// không cần migration). Người dùng phải có game_profiles chứa UID FF của họ.
export const maxDuration = 30;

const LAST_RANKS_KEY = "bxh.last_ranks";
const TOP_N = 100;

type ScoreRow = { ff_id: string; nickname: string | null };
type UserRow = { id: string; game_profiles: Array<{ uid?: string }> | null };

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // 1. BXH hiện tại → map ff_id → { rank, nickname }
  const { data: scores } = (await untypedFrom(db, "ff_auto_scores")
    .select("ff_id, nickname")
    .eq("region", "VN")
    .order("score", { ascending: false })
    .limit(TOP_N)) as { data: ScoreRow[] | null };

  const ranks = new Map<string, { rank: number; nickname: string }>();
  (scores ?? []).forEach((s, i) => {
    if (s.ff_id) ranks.set(String(s.ff_id).trim(), { rank: i + 1, nickname: s.nickname ?? String(s.ff_id) });
  });

  // 2. Rank lần trước (settings JSON). Lần đầu chỉ seed, không bắn thông báo.
  const { data: prevRow } = (await untypedFrom(db, "settings")
    .select("value")
    .eq("key", LAST_RANKS_KEY)
    .maybeSingle()) as { data: { value: string } | null };
  let prev: Record<string, number> = {};
  try {
    prev = prevRow?.value ? (JSON.parse(prevRow.value) as Record<string, number>) : {};
  } catch {
    prev = {};
  }
  const isFirstRun = Object.keys(prev).length === 0;

  // 3. Người dùng có game_profiles (chứa UID FF)
  const { data: users } = (await untypedFrom(db, "users")
    .select("id, game_profiles")
    .not("game_profiles", "is", null)
    .limit(10000)) as { data: UserRow[] | null };

  let notified = 0;
  if (!isFirstRun) {
    for (const u of users ?? []) {
      const uids = Array.isArray(u.game_profiles)
        ? u.game_profiles.map((g) => String(g?.uid ?? "").trim()).filter(Boolean)
        : [];
      // Chỉ thông báo 1 lần / user cho nick tốt nhất (rank nhỏ nhất) đã cải thiện.
      let best: { uid: string; rank: number; nickname: string; before?: number } | null = null;
      for (const uid of uids) {
        const cur = ranks.get(uid);
        if (!cur) continue;
        const before = prev[uid];
        const improved = before == null || cur.rank < before;
        if (improved && (!best || cur.rank < best.rank)) best = { uid, rank: cur.rank, nickname: cur.nickname, before };
      }
      if (best) {
        await createNotification({
          user_id: u.id,
          type: "bxh_rank_up",
          title:
            best.before == null
              ? `🔥 Nick ${best.nickname} lọt Top ${TOP_N} BXH nick khủng VN — hạng #${best.rank}`
              : `🔥 Nick ${best.nickname} lên hạng #${best.rank} trên BXH nick khủng VN`,
          body: `Chúc mừng! Nick của bạn đang xếp hạng #${best.rank} khu vực Việt Nam.`,
          entity_type: "leaderboard",
          entity_id: best.uid,
          entity_url: "/bxh-nick-vn",
        });
        notified++;
      }
    }
  }

  // 4. Lưu rank hiện tại để lần sau so sánh.
  const nextRanks: Record<string, number> = {};
  for (const [uid, v] of ranks) nextRanks[uid] = v.rank;
  await untypedFrom(db, "settings").upsert(
    { key: LAST_RANKS_KEY, value: JSON.stringify(nextRanks), updated_at: new Date().toISOString() } as never,
    { onConflict: "key" },
  );

  return NextResponse.json({ ok: true, tracked: ranks.size, notified, seeded: isFirstRun });
}
