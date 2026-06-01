import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

type AvatarFrame = { id: string; name: string; css_ring: string; rarity: string | null };
type UserTitle  = { name: string; color: string; rarity: string | null };

// GET — fetch user's equipped cosmetics + available cosmetics
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "user-cosmetics-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminSupabaseClient() ?? supabase;

  const [userRow, frames, titles] = await Promise.all([
    untypedFrom(db, "users")
      .select("selected_frame_id, selected_title")
      .eq("id", user.id).single() as unknown as Promise<{
        data: { selected_frame_id: string | null; selected_title: string | null } | null;
      }>,
    untypedFrom(db, "avatar_frames")
      .select("id, name, css_ring, rarity")
      .order("rarity", { ascending: false }) as unknown as Promise<{ data: AvatarFrame[] | null }>,
    untypedFrom(db, "user_titles")
      .select("name, color, rarity")
      .order("rarity", { ascending: false }) as unknown as Promise<{ data: UserTitle[] | null }>,
  ]);

  return NextResponse.json({
    selected_frame_id: userRow.data?.selected_frame_id ?? null,
    selected_title:    userRow.data?.selected_title ?? null,
    frames:  frames.data  ?? [],
    titles:  titles.data  ?? [],
  });
}

// PATCH — update equipped frame or title
export async function PATCH(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "user-cosmetics-patch", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    selected_frame_id?: string | null;
    selected_title?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if ("selected_frame_id" in body) updates.selected_frame_id = body.selected_frame_id ?? null;
  if ("selected_title"    in body) updates.selected_title    = body.selected_title    ?? null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có thay đổi." }, { status: 400 });
  }

  const db = createAdminSupabaseClient() ?? supabase;
  const { error } = await untypedFrom(db, "users")
    .update(updates as never)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Không thể lưu." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
