import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getPlayerAllData, isFfApiConfigured, type FfResponse } from "@/lib/server/ff-api";
import { SITE_URL } from "@/lib/constants/site";

/**
 * Theo dõi nick Free Fire.
 *
 * Mỗi lần quét: chụp lại chỉ số của những nick đang có người ghim, so với lần
 * chụp gần nhất, ghi ra từng biến động rồi báo cho người theo dõi.
 *
 * Vì sao lưu cả dòng thời gian chứ không chỉ giá trị mới nhất: lịch sử đổi tên
 * và đổi guild là thứ người mua acc cần nhất — một nick đổi tên 3 lần trong 2
 * tháng gần như chắc chắn đã qua tay nhiều chủ.
 *
 * Quota API HL có hạn nên mỗi lượt chỉ quét `MAX_PER_SWEEP` nick, ưu tiên nick
 * lâu chưa chụp nhất. Nick mới ghim (chưa có snapshot nào) luôn được xếp trước.
 */

/** Trần số nick mỗi lượt quét — giữ cho cron không ăn hết quota FF trong ngày. */
const MAX_PER_SWEEP = 60;

/** Nghỉ giữa 2 lần gọi API để không bị HL chặn vì gọi dồn. */
const GAP_MS = 250;

export type WatchField = "nickname" | "guild" | "level" | "br_rank" | "cs_rank";

export interface PlayerSnapshot {
  ff_id: string;
  nickname: string | null;
  level: number | null;
  likes: number | null;
  exp: number | null;
  br_rank_point: number | null;
  cs_rank_point: number | null;
  guild_name: string | null;
  guild_level: number | null;
  captured_at?: string;
}

export interface PlayerChange {
  ff_id: string;
  field: WatchField;
  old_value: string | null;
  new_value: string | null;
  changed_at?: string;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

/** Rút chỉ số cần theo dõi ra khỏi payload AllData của HL Gaming. */
export function snapshotFromFfResponse(ffId: string, res: FfResponse | null): PlayerSnapshot | null {
  const account = res?.result?.AccountInfo as Record<string, unknown> | undefined;
  if (!account) return null;
  const guild = res?.result?.GuildInfo as Record<string, unknown> | undefined;

  return {
    ff_id: ffId,
    nickname: toStr(account.AccountName),
    level: toNum(account.AccountLevel),
    likes: toNum(account.AccountLikes),
    exp: toNum(account.AccountEXP),
    br_rank_point: toNum(account.BrRankPoint),
    cs_rank_point: toNum(account.CsRankPoint),
    guild_name: toStr(guild?.GuildName),
    guild_level: toNum(guild?.GuildLevel),
  };
}

/**
 * So hai lần chụp, trả về danh sách biến động.
 *
 * Chỉ báo khi giá trị mới CÓ THẬT: API thỉnh thoảng trả thiếu phần Guild, mà
 * coi "thiếu" là "đã rời guild" thì người dùng nhận báo động giả mỗi tuần.
 */
export function diffSnapshots(prev: PlayerSnapshot, next: PlayerSnapshot): PlayerChange[] {
  const out: PlayerChange[] = [];
  const push = (field: WatchField, oldV: string | null, newV: string | null) =>
    out.push({ ff_id: next.ff_id, field, old_value: oldV, new_value: newV });

  if (next.nickname && next.nickname !== prev.nickname) {
    push("nickname", prev.nickname, next.nickname);
  }
  // Rời guild (prev có, next rỗng) chỉ tính khi API thật sự trả về phần guild —
  // suy ra bằng việc có nickname mới: payload hỏng thì nickname cũng rỗng.
  if (next.nickname && (next.guild_name ?? null) !== (prev.guild_name ?? null)) {
    push("guild", prev.guild_name, next.guild_name);
  }
  if (next.level !== null && prev.level !== null && next.level !== prev.level) {
    push("level", String(prev.level), String(next.level));
  }
  if (next.br_rank_point !== null && prev.br_rank_point !== null && next.br_rank_point !== prev.br_rank_point) {
    push("br_rank", String(prev.br_rank_point), String(next.br_rank_point));
  }
  if (next.cs_rank_point !== null && prev.cs_rank_point !== null && next.cs_rank_point !== prev.cs_rank_point) {
    push("cs_rank", String(prev.cs_rank_point), String(next.cs_rank_point));
  }
  return out;
}

const CHANGE_LABEL: Record<WatchField, string> = {
  nickname: "đổi tên",
  guild: "đổi guild",
  level: "lên level",
  br_rank: "đổi điểm rank BR",
  cs_rank: "đổi điểm rank CS",
};

/** Câu mô tả một biến động, dùng chung cho thông báo và dòng thời gian. */
export function describeChange(c: Pick<PlayerChange, "field" | "old_value" | "new_value">): string {
  const label = CHANGE_LABEL[c.field] ?? c.field;
  if (c.field === "guild") {
    if (!c.old_value) return `gia nhập guild ${c.new_value}`;
    if (!c.new_value) return `rời guild ${c.old_value}`;
    return `${label}: ${c.old_value} → ${c.new_value}`;
  }
  return `${label}: ${c.old_value ?? "?"} → ${c.new_value ?? "?"}`;
}

interface SweepResult {
  ok: boolean;
  reason?: string;
  scanned: number;
  changed: number;
  notified: number;
}

/**
 * Quét một lượt. Gọi từ cron `/api/cron/ff-watch` (xem vercel.json).
 * Nuốt mọi lỗi của từng nick để một nick hỏng không chặn cả lượt.
 */
export async function runFfWatchSweep(): Promise<SweepResult> {
  const empty = { scanned: 0, changed: 0, notified: 0 };
  if (!isFfApiConfigured()) return { ok: false, reason: "ff_api_not_configured", ...empty };

  const db = createAdminSupabaseClient();
  if (!db) return { ok: false, reason: "no_db", ...empty };

  const { data: watchRows, error } = (await untypedFrom(db, "ff_player_watches")
    .select("ff_id")) as { data: { ff_id: string }[] | null; error: unknown };
  if (error) return { ok: false, reason: "watch_table_missing", ...empty };

  const ffIds = [...new Set((watchRows ?? []).map((r) => r.ff_id))];
  if (ffIds.length === 0) return { ok: true, ...empty };

  // Lần chụp gần nhất của mỗi nick, để xếp nick lâu chưa chụp lên trước.
  const { data: snapRows } = (await untypedFrom(db, "ff_player_snapshots")
    .select("ff_id, captured_at")
    .in("ff_id", ffIds)
    .order("captured_at", { ascending: false })) as {
    data: { ff_id: string; captured_at: string }[] | null;
  };

  const lastSeen = new Map<string, string>();
  for (const row of snapRows ?? []) {
    if (!lastSeen.has(row.ff_id)) lastSeen.set(row.ff_id, row.captured_at);
  }

  const queue = ffIds
    .sort((a, b) => (lastSeen.get(a) ?? "").localeCompare(lastSeen.get(b) ?? ""))
    .slice(0, MAX_PER_SWEEP);

  let scanned = 0;
  let changed = 0;
  let notified = 0;

  for (const ffId of queue) {
    try {
      const res = await getPlayerAllData(ffId).catch(() => null);
      const next = snapshotFromFfResponse(ffId, res);
      if (!next) continue;
      scanned += 1;

      const { data: prevRows } = (await untypedFrom(db, "ff_player_snapshots")
        .select("ff_id, nickname, level, likes, exp, br_rank_point, cs_rank_point, guild_name, guild_level")
        .eq("ff_id", ffId)
        .order("captured_at", { ascending: false })
        .limit(1)) as { data: PlayerSnapshot[] | null };

      const prev = prevRows?.[0] ?? null;
      const changes = prev ? diffSnapshots(prev, next) : [];

      await untypedFrom(db, "ff_player_snapshots").insert(next as never);

      if (changes.length > 0) {
        changed += 1;
        await untypedFrom(db, "ff_player_changes").insert(changes as never);
        notified += await notifyWatchers(ffId, next.nickname, changes);
      }
    } catch {
      // Nick lỗi thì bỏ qua, lượt sau chụp lại.
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  return { ok: true, scanned, changed, notified };
}

/** Đẩy thông báo trong app cho mọi người đang ghim nick này. */
async function notifyWatchers(
  ffId: string,
  nickname: string | null,
  changes: PlayerChange[],
): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) return 0;

  const { data: watchers } = (await untypedFrom(db, "ff_player_watches")
    .select("user_id")
    .eq("ff_id", ffId)) as { data: { user_id: string }[] | null };

  if (!watchers?.length) return 0;

  const who = nickname ? `${nickname} (${ffId})` : ffId;
  const body = changes.map(describeChange).join(" · ");

  const rows = watchers.map((w) => ({
    user_id: w.user_id,
    type: "ff_watch",
    title: `Nick ${who} có biến động`,
    body,
    entity_type: "ff_player",
    entity_id: ffId,
    entity_url: `${SITE_URL}/player-lookup?uid=${ffId}`,
  }));

  const { error } = (await untypedFrom(db, "notifications").insert(rows as never)) as { error: unknown };
  return error ? 0 : rows.length;
}

export interface PlayerTimeline {
  latest: PlayerSnapshot | null;
  changes: PlayerChange[];
  /** Số lần đổi tên / đổi guild — hai con số người mua acc nhìn đầu tiên. */
  nicknameChanges: number;
  guildChanges: number;
  trackedSince: string | null;
}

/** Dòng thời gian công khai của một nick. Trả rỗng nếu chưa từng được theo dõi. */
export async function getPlayerTimeline(ffId: string, limit = 50): Promise<PlayerTimeline> {
  const empty: PlayerTimeline = {
    latest: null,
    changes: [],
    nicknameChanges: 0,
    guildChanges: 0,
    trackedSince: null,
  };

  const db = createAdminSupabaseClient();
  if (!db) return empty;

  const [{ data: snaps }, { data: changes }] = await Promise.all([
    untypedFrom(db, "ff_player_snapshots")
      .select("ff_id, nickname, level, likes, exp, br_rank_point, cs_rank_point, guild_name, guild_level, captured_at")
      .eq("ff_id", ffId)
      .order("captured_at", { ascending: false })
      .limit(1) as unknown as Promise<{ data: PlayerSnapshot[] | null }>,
    untypedFrom(db, "ff_player_changes")
      .select("ff_id, field, old_value, new_value, changed_at")
      .eq("ff_id", ffId)
      .order("changed_at", { ascending: false })
      .limit(limit) as unknown as Promise<{ data: PlayerChange[] | null }>,
  ]);

  const rows = changes ?? [];

  // Ngày bắt đầu theo dõi = lần chụp cũ nhất, không phải lần đổi cũ nhất.
  const { data: firstSnap } = (await untypedFrom(db, "ff_player_snapshots")
    .select("captured_at")
    .eq("ff_id", ffId)
    .order("captured_at", { ascending: true })
    .limit(1)) as { data: { captured_at: string }[] | null };

  return {
    latest: snaps?.[0] ?? null,
    changes: rows,
    nicknameChanges: rows.filter((c) => c.field === "nickname").length,
    guildChanges: rows.filter((c) => c.field === "guild").length,
    trackedSince: firstSnap?.[0]?.captured_at ?? null,
  };
}
