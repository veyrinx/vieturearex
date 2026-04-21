import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";

const urlOrEmpty = z.string().max(300).optional().default("").transform((v) => {
  if (!v) return null;
  try { new URL(v); return v; } catch { return null; }
});

const schema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  bio: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  avatar_url: urlOrEmpty,
  facebook_url: urlOrEmpty,
  tiktok_url: urlOrEmpty,
  instagram_url: urlOrEmpty,
  youtube_url: urlOrEmpty,
  website_url: urlOrEmpty,
});

type ProfileRow = {
  display_name: string | null;
  role: string;
  created_at: string;
  views: number;
  is_verified?: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, role, created_at, views, is_verified, avatar_url, bio, phone, facebook_url, tiktok_url, instagram_url, youtube_url, website_url")
    .eq("id", user.id)
    .maybeSingle() as { data: ProfileRow | null };

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? "user",
    views: profile?.views ?? 0,
    created_at: profile?.created_at ?? user.created_at,
    is_verified: profile?.is_verified ?? false,
    avatar_url: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
    phone: profile?.phone ?? null,
    facebook_url: profile?.facebook_url ?? null,
    tiktok_url: profile?.tiktok_url ?? null,
    instagram_url: profile?.instagram_url ?? null,
    youtube_url: profile?.youtube_url ?? null,
    website_url: profile?.website_url ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-profile", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const updates: Record<string, string | null> = {};
  const d = parsed.data;

  if (d.display_name !== undefined) updates.display_name = d.display_name || null;
  if (d.bio !== undefined) updates.bio = d.bio || null;
  if (d.phone !== undefined) updates.phone = d.phone || null;
  if (d.avatar_url !== undefined) updates.avatar_url = d.avatar_url;
  if (d.facebook_url !== undefined) updates.facebook_url = d.facebook_url;
  if (d.tiktok_url !== undefined) updates.tiktok_url = d.tiktok_url;
  if (d.instagram_url !== undefined) updates.instagram_url = d.instagram_url;
  if (d.youtube_url !== undefined) updates.youtube_url = d.youtube_url;
  if (d.website_url !== undefined) updates.website_url = d.website_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(updates as never).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
