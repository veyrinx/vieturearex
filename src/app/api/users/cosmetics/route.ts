import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

type UserRow = {
  selected_frame_id: string | null;
  selected_title: string | null;
  profile_color: string | null;
};

type FrameRow = {
  id: string;
  name: string;
  css_ring: string;
  description: string | null;
  rarity: string;
  sort_order: number;
};

type TitleRow = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  rarity: string;
  requirement: string | null;
  sort_order: number;
};

const updateSchema = z.object({
  frame_id: z.string().uuid().nullable().optional(),
  title:    z.string().nullable().optional(),
  color:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "cosmetics-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [userRes, framesRes, titlesRes] = await Promise.all([
    untypedFrom(db, "users")
      .select("selected_frame_id, selected_title, profile_color")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: UserRow | null }>,

    untypedFrom(db, "avatar_frames")
      .select("id, name, css_ring, description, rarity, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: FrameRow[] | null }>,

    untypedFrom(db, "user_titles")
      .select("id, name, color, description, rarity, requirement, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: TitleRow[] | null }>,
  ]);

  return NextResponse.json({
    myFrame: userRes.data?.selected_frame_id ?? null,
    myTitle: userRes.data?.selected_title ?? null,
    myColor: userRes.data?.profile_color ?? "#6366f1",
    frames:  framesRes.data ?? [],
    titles:  titlesRes.data ?? [],
  });
}

export async function PUT(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "cosmetics-put", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const updates: Record<string, unknown> = {};
  if ("frame_id" in parsed.data) updates["selected_frame_id"] = parsed.data.frame_id ?? null;
  if ("title"    in parsed.data) updates["selected_title"]    = parsed.data.title ?? null;
  if ("color"    in parsed.data) updates["profile_color"]     = parsed.data.color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await untypedFrom(db, "users")
    .update(updates as never)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
