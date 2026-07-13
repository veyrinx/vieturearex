import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PublicTierEntry = {
  id: string;
  name: string;
  image_url: string;
  tier: string;
  ref_id: string | null;
  /** Slug of the linked weapon, when ref_id points to an ff_weapons row. */
  slug: string | null;
};

export type PublicTierList = {
  id: string;
  kind: "character" | "weapon";
  patch: string;
  updated_at: string;
  entries: PublicTierEntry[];
};

type TierListRow = {
  id: string;
  kind: string;
  patch: string;
  updated_at: string;
  tier_list_entries: Array<{
    id: string;
    name: string;
    image_url: string;
    tier: string;
    ref_id: string | null;
    position: number | null;
  }> | null;
};

export async function getPublicTierLists(): Promise<PublicTierList[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await (supabase.from("tier_lists") as ReturnType<typeof supabase.from>)
    .select("id, kind, patch, updated_at, tier_list_entries(id, name, image_url, tier, ref_id, position)")
    .order("updated_at", { ascending: false }) as { data: TierListRow[] | null; error: { message?: string } | null };

  if (error || !data) {
    if (error) console.error("Error fetching tier lists:", error);
    return [];
  }

  // Resolve ref_id → weapon slug so entries can link to detail pages.
  const refIds = Array.from(
    new Set(
      data.flatMap((l) => (l.tier_list_entries ?? []).map((e) => e.ref_id).filter((r): r is string => Boolean(r))),
    ),
  );

  const slugByRef = new Map<string, string>();
  if (refIds.length > 0) {
    const { data: weapons } = await (supabase.from("ff_weapons") as ReturnType<typeof supabase.from>)
      .select("id, slug")
      .in("id", refIds) as { data: { id: string; slug: string }[] | null };
    for (const w of weapons ?? []) slugByRef.set(w.id, w.slug);
  }

  return data.map((list) => ({
    id: list.id,
    kind: list.kind === "character" ? "character" : "weapon",
    patch: list.patch,
    updated_at: list.updated_at,
    entries: (list.tier_list_entries ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((e) => ({
        id: e.id,
        name: e.name,
        image_url: e.image_url,
        tier: e.tier,
        ref_id: e.ref_id,
        slug: e.ref_id ? slugByRef.get(e.ref_id) ?? null : null,
      })),
  }));
}
