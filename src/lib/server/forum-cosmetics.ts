import type { SupabaseClient } from "@supabase/supabase-js";
import { untypedFrom } from "@/lib/supabase/untyped";

export type UserCosmetics = {
  css_ring: string | null;
  title: string | null;
  title_color: string | null;
  role: string | null;
  is_verified: boolean;
};

export async function fetchCosmetics(
  db: SupabaseClient,
  userIds: string[],
): Promise<Map<string, UserCosmetics>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();

  const { data: users } = await (untypedFrom(db, "users")
    .select("id, selected_title, selected_frame_id, role, is_verified")
    .in("id", ids) as unknown as Promise<{
    data: Array<{ id: string; selected_title: string | null; selected_frame_id: string | null; role: string | null; is_verified: boolean | null }> | null;
  }>);

  if (!users?.length) return new Map();

  const frameIds = [...new Set(users.map((u) => u.selected_frame_id).filter((x): x is string => !!x))];
  const titleNames = [...new Set(users.map((u) => u.selected_title).filter((x): x is string => !!x))];

  const [framesRes, titlesRes] = await Promise.all([
    frameIds.length
      ? (untypedFrom(db, "avatar_frames").select("id, css_ring").in("id", frameIds) as unknown as Promise<{
          data: Array<{ id: string; css_ring: string }> | null;
        }>)
      : Promise.resolve({ data: [] as Array<{ id: string; css_ring: string }> }),
    titleNames.length
      ? (untypedFrom(db, "user_titles").select("name, color").in("name", titleNames) as unknown as Promise<{
          data: Array<{ name: string; color: string }> | null;
        }>)
      : Promise.resolve({ data: [] as Array<{ name: string; color: string }> }),
  ]);

  const frameMap = new Map((framesRes.data ?? []).map((f) => [f.id, f.css_ring]));
  const titleMap = new Map((titlesRes.data ?? []).map((t) => [t.name, t.color]));

  return new Map(
    users.map((u) => [
      u.id,
      {
        css_ring: u.selected_frame_id ? (frameMap.get(u.selected_frame_id) ?? null) : null,
        title: u.selected_title ?? null,
        title_color: u.selected_title ? (titleMap.get(u.selected_title) ?? null) : null,
        role: u.role ?? null,
        is_verified: Boolean(u.is_verified),
      },
    ]),
  );
}
