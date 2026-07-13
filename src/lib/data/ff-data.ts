import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import type { CommentWithAuthor } from "@/lib/types/content";
import { FF_ITEM_IMAGE_BASE_URL } from "@/lib/constants/ff-items";
import type { WeaponAttachment } from "@/lib/constants/weapon-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const TIER_META: Record<string, { color: string; shadow: string }> = {
  S: { color: "bg-[#ff7f7f]", shadow: "shadow-[0_0_12px_#ff7f7f]" },
  A: { color: "bg-[#ffbf7f]", shadow: "shadow-[0_0_12px_#ffbf7f]" },
  B: { color: "bg-[#ffff7f]", shadow: "shadow-[0_0_12px_#ffff7f]" },
  C: { color: "bg-[#7fff7f]", shadow: "shadow-[0_0_12px_#7fff7f]" },
  D: { color: "bg-[#7fbfff]", shadow: "shadow-[0_0_12px_#7fbfff]" },
};

export const getTierColor = (tier: string) => TIER_META[tier] ?? { color: "bg-muted", shadow: "" };

type TierListInfo = {
  id: string;
  kind: "character" | "weapon";
  patch: string;
  tier: string;
  updated_at: string;
};

export type RatingInfo = {
  average: number;
  count: number;
  user_rating: number | null;
};

export type WeaponDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string;
  damage: number | null;
  range: number | null;
  rate_of_fire: number | null;
  reload: number | null;
  magazine: number | null;
  weapon_type: string | null;
  ob: string | null;
  attachments: WeaponAttachment[] | null;
  released_at: string | null;
  tier_lists: TierListInfo[];
  comments: CommentWithAuthor[];
  ratings: RatingInfo;
};

type TierEntryRow = {
  tier: string;
  tier_lists: { id: string; kind: string; patch: string; updated_at: string } | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  author: { display_name: string | null; avatar_url: string | null } | null;
};

type RatingsRpc = { average_rating: number; rating_count: number; user_rating: number | null } | null;

type Client = NonNullable<ReturnType<typeof createServerSupabaseClient>>;

async function fetchTierLists(supabase: Client, refId: string): Promise<TierListInfo[]> {
  const { data } = await (supabase.from("tier_list_entries") as ReturnType<typeof supabase.from>)
    .select("tier, tier_lists(id, kind, patch, updated_at)")
    .eq("ref_id", refId) as { data: TierEntryRow[] | null };

  return (data ?? [])
    .filter((entry): entry is TierEntryRow & { tier_lists: NonNullable<TierEntryRow["tier_lists"]> } => Boolean(entry.tier_lists))
    .map((entry) => ({
      id: entry.tier_lists.id,
      kind: (entry.tier_lists.kind === "character" ? "character" : "weapon") as "character" | "weapon",
      patch: entry.tier_lists.patch,
      tier: entry.tier,
      updated_at: entry.tier_lists.updated_at,
    }))
    .sort((a, b) => Number(b.patch) - Number(a.patch));
}

async function fetchComments(supabase: Client, itemId: string): Promise<CommentWithAuthor[]> {
  const { data } = await (supabase.from("item_comments") as ReturnType<typeof supabase.from>)
    .select("id, content, created_at, user_id, author:users(display_name, avatar_url)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(200) as { data: CommentRow[] | null };

  return (data ?? []).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user_id: c.user_id,
    author: c.author
      ? { ...c.author, id: c.user_id }
      : { id: c.user_id, display_name: "Ẩn danh", avatar_url: null },
  }));
}

async function fetchRatings(supabase: Client, itemId: string): Promise<RatingInfo> {
  const { data } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: RatingsRpc }>)("get_item_ratings", { p_item_id: itemId });

  return {
    average: Number(data?.average_rating ?? 0),
    count: Number(data?.rating_count ?? 0),
    user_rating: data?.user_rating ?? null,
  };
}

export async function getWeaponBySlug(slug: string): Promise<WeaponDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data: weapon, error } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("slug", slug)
    .maybeSingle() as { data: Omit<WeaponDetail, "tier_lists" | "comments" | "ratings"> | null; error: { message?: string } | null };

  if (error || !weapon) {
    if (error) console.error(`Error fetching weapon ${slug}:`, error);
    return null;
  }

  const [tier_lists, comments, ratings] = await Promise.all([
    fetchTierLists(supabase, weapon.id),
    fetchComments(supabase, weapon.id),
    fetchRatings(supabase, weapon.id),
  ]);

  return {
    ...weapon,
    image_url: weapon.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${weapon.id}.png`,
    tier_lists,
    comments,
    ratings,
  };
}

export type WeaponListItem = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  damage: number | null;
  range: number | null;
  weapon_type: string | null;
  ob: string | null;
  tier?: string | null;
};

// Tier hiện tại của mỗi vũ khí = tier trong tier list "weapon" có patch mới nhất.
async function fetchWeaponTiers(supabase: Client): Promise<Map<string, string>> {
  const { data } = await (supabase.from("tier_list_entries") as ReturnType<typeof supabase.from>)
    .select("ref_id, tier, tier_lists!inner(kind, patch)")
    .not("ref_id", "is", null)
    .eq("tier_lists.kind", "weapon") as {
      data: Array<{ ref_id: string; tier: string; tier_lists: { patch: string } | null }> | null;
    };

  const best = new Map<string, { tier: string; patch: number }>();
  for (const row of data ?? []) {
    if (!row.ref_id || !row.tier_lists) continue;
    const patch = Number(row.tier_lists.patch) || 0;
    const cur = best.get(row.ref_id);
    if (!cur || patch > cur.patch) best.set(row.ref_id, { tier: row.tier, patch });
  }

  return new Map([...best].map(([id, v]) => [id, v.tier]));
}

export async function getAllWeapons(): Promise<WeaponListItem[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const [{ data, error }, tiers] = await Promise.all([
    (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
      .select("id, slug, name, image_url, damage, range, weapon_type, ob")
      .order("name", { ascending: true })
      .limit(500) as Promise<{ data: WeaponListItem[] | null; error: { message?: string } | null }>,
    fetchWeaponTiers(supabase),
  ]);

  if (error || !data) {
    if (error) console.error("Error fetching weapons:", error);
    return [];
  }

  return data.map((w) => ({
    ...w,
    image_url: w.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${w.id}.png`,
    tier: tiers.get(w.id) ?? null,
  }));
}

// Danh sách vũ khí kèm đủ chỉ số — dùng cho trang so sánh (chọn 2 khẩu, so tại client).
export type WeaponCompareItem = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  weapon_type: string | null;
  ob: string | null;
  damage: number | null;
  range: number | null;
  rate_of_fire: number | null;
  reload: number | null;
  magazine: number | null;
};

export async function getWeaponsForCompare(): Promise<WeaponCompareItem[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
    .select("id, slug, name, image_url, weapon_type, ob, damage, range, rate_of_fire, reload, magazine")
    .order("name", { ascending: true })
    .limit(500) as { data: WeaponCompareItem[] | null };

  return (data ?? []).map((w) => ({
    ...w,
    image_url: w.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${w.id}.png`,
  }));
}

// Giá trị lớn nhất của từng chỉ số (toàn bộ vũ khí) — để chuẩn hoá thanh chỉ số.
export type WeaponStatMax = { damage: number; range: number; rate_of_fire: number };

export async function getWeaponStatMaxes(): Promise<WeaponStatMax> {
  noStore();
  const fallback: WeaponStatMax = { damage: 100, range: 100, rate_of_fire: 100 };
  const supabase = createServerSupabaseClient();
  if (!supabase) return fallback;

  type StatRow = { damage: number | null; range: number | null; rate_of_fire: number | null };
  const { data } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
    .select("damage, range, rate_of_fire")
    .limit(500) as { data: StatRow[] | null };

  if (!data || data.length === 0) return fallback;

  const max = (key: keyof StatRow) =>
    Math.max(1, ...data.map((w) => w[key] ?? 0));

  return { damage: max("damage"), range: max("range"), rate_of_fire: max("rate_of_fire") };
}

// Vũ khí cùng thể loại (loại trừ khẩu đang xem).
export async function getRelatedWeapons(
  weaponType: string | null,
  excludeId: string,
  limit = 6,
): Promise<WeaponListItem[]> {
  if (!weaponType) return [];
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
    .select("id, slug, name, image_url, damage, range, weapon_type, ob")
    .eq("weapon_type", weaponType)
    .neq("id", excludeId)
    .order("damage", { ascending: false, nullsFirst: false })
    .limit(limit) as { data: WeaponListItem[] | null };

  return (data ?? []).map((w) => ({
    ...w,
    image_url: w.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${w.id}.png`,
  }));
}

// ── Combo / loadout vũ khí ──────────────────────────────────
export type LoadoutWeaponRef = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  weapon_type: string | null;
} | null;

export type Loadout = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  playstyle: string | null;
  primary_weapon: LoadoutWeaponRef;
  secondary_weapon: LoadoutWeaponRef;
};

const LOADOUT_SELECT =
  "id, slug, name, description, image_url, playstyle, " +
  "primary_weapon:ff_weapons!primary_weapon_id(id, slug, name, image_url, weapon_type), " +
  "secondary_weapon:ff_weapons!secondary_weapon_id(id, slug, name, image_url, weapon_type)";

function normalizeWeaponRef(ref: LoadoutWeaponRef): LoadoutWeaponRef {
  if (!ref) return null;
  return { ...ref, image_url: ref.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${ref.id}.png` };
}

export async function getAllLoadouts(): Promise<Loadout[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await (supabase.from("ff_loadouts") as ReturnType<typeof supabase.from>)
    .select(LOADOUT_SELECT)
    .order("position", { ascending: true })
    .order("name", { ascending: true })
    .limit(200) as { data: Loadout[] | null; error: { message?: string } | null };

  if (error || !data) {
    if (error) console.error("Error fetching loadouts:", error);
    return [];
  }

  return data.map((l) => ({
    ...l,
    primary_weapon: normalizeWeaponRef(l.primary_weapon),
    secondary_weapon: normalizeWeaponRef(l.secondary_weapon),
  }));
}

// Combo kèm đủ chỉ số 2 khẩu — cho trang chi tiết combo.
export type LoadoutWeaponFull = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  weapon_type: string | null;
  damage: number | null;
  range: number | null;
  rate_of_fire: number | null;
  reload: number | null;
  magazine: number | null;
} | null;

export type LoadoutDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  playstyle: string | null;
  primary_weapon: LoadoutWeaponFull;
  secondary_weapon: LoadoutWeaponFull;
};

const LOADOUT_DETAIL_WEAPON = "(id, slug, name, image_url, weapon_type, damage, range, rate_of_fire, reload, magazine)";

export async function getLoadoutBySlug(slug: string): Promise<LoadoutDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await (supabase.from("ff_loadouts") as ReturnType<typeof supabase.from>)
    .select(
      "id, slug, name, description, image_url, playstyle, " +
      `primary_weapon:ff_weapons!primary_weapon_id${LOADOUT_DETAIL_WEAPON}, ` +
      `secondary_weapon:ff_weapons!secondary_weapon_id${LOADOUT_DETAIL_WEAPON}`,
    )
    .eq("slug", slug)
    .maybeSingle() as { data: LoadoutDetail | null; error: { message?: string } | null };

  if (error || !data) {
    if (error) console.error(`Error fetching loadout ${slug}:`, error);
    return null;
  }

  const fix = (w: LoadoutWeaponFull): LoadoutWeaponFull =>
    w ? { ...w, image_url: w.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${w.id}.png` } : null;

  return { ...data, primary_weapon: fix(data.primary_weapon), secondary_weapon: fix(data.secondary_weapon) };
}

// Combo có chứa 1 khẩu vũ khí — cross-link ở trang chi tiết súng.
export async function getLoadoutsForWeapon(weaponId: string, limit = 6): Promise<Loadout[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await (supabase.from("ff_loadouts") as ReturnType<typeof supabase.from>)
    .select(LOADOUT_SELECT)
    .or(`primary_weapon_id.eq.${weaponId},secondary_weapon_id.eq.${weaponId}`)
    .order("position", { ascending: true })
    .limit(limit) as { data: Loadout[] | null };

  return (data ?? []).map((l) => ({
    ...l,
    primary_weapon: normalizeWeaponRef(l.primary_weapon),
    secondary_weapon: normalizeWeaponRef(l.secondary_weapon),
  }));
}
