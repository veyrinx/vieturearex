import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";

const urlOrEmpty = z.string().max(300).optional().default("").transform((v) => {
  if (!v) return null;
  try { new URL(v); return v; } catch { return null; }
});

const gameProfileSchema = z.object({
  game: z.string().min(1).max(40),
  custom_label: z.string().max(40).optional(),
  uid: z.string().min(1).max(60),
  nickname: z.string().max(60).optional(),
});

const schema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  bio: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  game_profiles: z.array(gameProfileSchema).max(20).optional(),
  avatar_url: urlOrEmpty,
  facebook_url: urlOrEmpty,
  tiktok_url: urlOrEmpty,
  instagram_url: urlOrEmpty,
  youtube_url: urlOrEmpty,
  website_url: urlOrEmpty,
  discord_url: urlOrEmpty,
  twitch_url: urlOrEmpty,
  twitter_url: urlOrEmpty,
  telegram_url: urlOrEmpty,
  zalo_url: urlOrEmpty,
  threads_url: urlOrEmpty,
  github_url: urlOrEmpty,
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
  discord_url?: string | null;
  twitch_url?: string | null;
  twitter_url?: string | null;
  telegram_url?: string | null;
  zalo_url?: string | null;
  threads_url?: string | null;
  github_url?: string | null;
  game_profiles?: unknown;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Use admin client to bypass RLS — falls back to server client if not configured
  const adminClient = createAdminSupabaseClient();
  const roleClient = (adminClient ?? supabase) as typeof supabase;

  const { data: profile } = await roleClient
    .from("users")
    .select("display_name, role, created_at, views, is_verified, avatar_url, bio, phone, facebook_url, tiktok_url, instagram_url, youtube_url, website_url, discord_url, twitch_url, twitter_url, telegram_url, zalo_url, threads_url, github_url, game_profiles")
    .eq("id", user.id)
    .maybeSingle() as { data: ProfileRow | null };

  // Fallback role from app_metadata if DB query was blocked
  const appMetaRole = (user.app_metadata?.role as string | undefined) ?? null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? appMetaRole ?? "user",
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
    discord_url: profile?.discord_url ?? null,
    twitch_url: profile?.twitch_url ?? null,
    twitter_url: profile?.twitter_url ?? null,
    telegram_url: profile?.telegram_url ?? null,
    zalo_url: profile?.zalo_url ?? null,
    threads_url: profile?.threads_url ?? null,
    github_url: profile?.github_url ?? null,
    game_profiles: Array.isArray(profile?.game_profiles) ? profile?.game_profiles : [],
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

  const updates: Record<string, unknown> = {};
  const d = parsed.data;

  if (d.display_name !== undefined) updates.display_name = d.display_name || null;
  if (d.bio !== undefined) updates.bio = d.bio || null;
  if (d.phone !== undefined) updates.phone = d.phone || null;
  if (d.game_profiles !== undefined) {
    updates.game_profiles = d.game_profiles
      .map((g) => ({
        game: g.game.trim(),
        custom_label: g.custom_label?.trim() || undefined,
        uid: g.uid.trim(),
        nickname: g.nickname?.trim() || undefined,
      }))
      .filter((g) => g.game && g.uid);
  }
  if (d.avatar_url !== undefined) updates.avatar_url = d.avatar_url;
  if (d.facebook_url !== undefined) updates.facebook_url = d.facebook_url;
  if (d.tiktok_url !== undefined) updates.tiktok_url = d.tiktok_url;
  if (d.instagram_url !== undefined) updates.instagram_url = d.instagram_url;
  if (d.youtube_url !== undefined) updates.youtube_url = d.youtube_url;
  if (d.website_url !== undefined) updates.website_url = d.website_url;
  if (d.discord_url !== undefined) updates.discord_url = d.discord_url;
  if (d.twitch_url !== undefined) updates.twitch_url = d.twitch_url;
  if (d.twitter_url !== undefined) updates.twitter_url = d.twitter_url;
  if (d.telegram_url !== undefined) updates.telegram_url = d.telegram_url;
  if (d.zalo_url !== undefined) updates.zalo_url = d.zalo_url;
  if (d.threads_url !== undefined) updates.threads_url = d.threads_url;
  if (d.github_url !== undefined) updates.github_url = d.github_url;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
  }

  // Use admin client to bypass RLS so users can update their own profile reliably
  const adminClient = createAdminSupabaseClient();
  const writeClient = (adminClient ?? supabase) as typeof supabase;

  const { error } = await writeClient.from("users").update(updates as never).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
