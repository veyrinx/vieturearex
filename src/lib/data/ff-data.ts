import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import type { CommentWithAuthor } from "@/lib/types/content";
import { FF_ITEM_IMAGE_BASE_URL } from "@/lib/constants/ff-items";
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
};

export async function getAllWeapons(): Promise<WeaponListItem[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
    .select("id, slug, name, image_url, damage, range")
    .order("name", { ascending: true })
    .limit(500) as { data: WeaponListItem[] | null; error: { message?: string } | null };

  if (error || !data) {
    if (error) console.error("Error fetching weapons:", error);
    return [];
  }

  return data.map((w) => ({
    ...w,
    image_url: w.image_url || `${FF_ITEM_IMAGE_BASE_URL}/${w.id}.png`,
  }));
}
