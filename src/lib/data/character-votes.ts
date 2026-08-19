import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { charSlug } from "@/lib/data/ff-characters";

// Số phiếu bình chọn ở /character-poll, quy về slug để trang wiki nhân vật
// (/characters) dùng lại được. Poll lưu theo `name` chứ không có slug, nên phải
// nối bằng charSlug — tên trong bảng cấu hình poll trùng tên trong thư viện.

const CURRENT_SEASON = "S1";

export type CharacterVoteStat = { votes: number; percent: number };
export type CharacterVoteMap = {
  bySlug: Record<string, CharacterVoteStat>;
  total: number;
  season: string;
};

const EMPTY: CharacterVoteMap = { bySlug: {}, total: 0, season: CURRENT_SEASON };

async function loadCharacterVotes(): Promise<CharacterVoteMap> {
  const db = createAdminSupabaseClient();
  if (!db) return EMPTY;

  const [{ data: configs }, { data: logs }] = await Promise.all([
    untypedFrom(db, "character_votes_config")
      .select("id, name")
      .eq("season", CURRENT_SEASON)
      .then((r) => r as { data: Array<{ id: string; name: string }> | null }),
    untypedFrom(db, "character_vote_logs")
      .select("character_id")
      .eq("season", CURRENT_SEASON)
      .then((r) => r as { data: Array<{ character_id: string }> | null }),
  ]);

  if (!configs?.length) return EMPTY;

  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    counts.set(log.character_id, (counts.get(log.character_id) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const bySlug: Record<string, CharacterVoteStat> = {};
  for (const cfg of configs) {
    const votes = counts.get(cfg.id) ?? 0;
    // Nhiều dòng cấu hình có thể trỏ về cùng một nhân vật (mùa cũ/mới) — cộng dồn.
    const slug = charSlug(cfg.name);
    const prev = bySlug[slug]?.votes ?? 0;
    bySlug[slug] = {
      votes: prev + votes,
      percent: total > 0 ? Math.round(((prev + votes) / total) * 100) : 0,
    };
  }

  return { bySlug, total, season: CURRENT_SEASON };
}

// Kết quả bình chọn đổi rất chậm còn trang wiki thì bị crawl liên tục → cache 5
// phút để mỗi lượt xem không phải quét lại toàn bộ bảng phiếu.
export const getCharacterVotes = unstable_cache(loadCharacterVotes, ["character-votes"], {
  revalidate: 300,
  tags: ["character-votes"],
});
