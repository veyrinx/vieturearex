import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { checkProfileAchievements } from "@/lib/server/award-achievement";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import { normalizeBadges } from "@/lib/constants/user-badges";

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
  contact_email: z.union([z.string().email().max(120), z.literal("")]).optional(),
  ff_id: z.union([z.string().regex(/^\d{6,12}$/, "FF ID phải là 6–12 chữ số"), z.literal("")]).optional(),
  game_profiles: z.array(gameProfileSchema).max(20).optional(),
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
  privacy: z.record(z.string(), z.boolean()).optional(),
});

type ProfileRow = {
  display_name: string | null;
  role: string;
  created_at: string;
  views: number;
  is_verified?: boolean;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  ff_id?: string | null;
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
  contact_email?: string | null;
  game_profiles?: unknown;
  selected_frame_id?: string | null;
  selected_title?: string | null;
  points?: number | null;
  privacy?: Record<string, boolean> | null;
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
    .select("display_name, role, created_at, views, is_verified, avatar_url, banner_url, bio, phone, ff_id, contact_email, facebook_url, tiktok_url, instagram_url, youtube_url, website_url, discord_url, twitch_url, twitter_url, telegram_url, zalo_url, threads_url, github_url, game_profiles, selected_frame_id, selected_title, points")
    .eq("id", user.id)
    .maybeSingle() as { data: ProfileRow | null };

  // Fetch privacy separately so a missing column (pre-migration) doesn't break the whole GET
  const { data: privRow } = await roleClient
    .from("users")
    .select("privacy")
    .eq("id", user.id)
    .maybeSingle() as { data: { privacy?: Record<string, boolean> | null } | null };

  // Nhãn hiển thị — cũng tách riêng vì cột badges đến từ migration-user-badges.sql
  const { data: badgeRow } = await roleClient
    .from("users")
    .select("badges")
    .eq("id", user.id)
    .maybeSingle() as { data: { badges?: unknown } | null };

  // Fallback role from app_metadata if DB query was blocked
  const appMetaRole = (user.app_metadata?.role as string | undefined) ?? null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? appMetaRole ?? "user",
    badges: normalizeBadges(badgeRow?.badges),
    views: profile?.views ?? 0,
    created_at: profile?.created_at ?? user.created_at,
    is_verified: profile?.is_verified ?? false,
    avatar_url: profile?.avatar_url ?? null,
    banner_url: profile?.banner_url ?? null,
    bio: profile?.bio ?? null,
    phone: profile?.phone ?? null,
    ff_id: profile?.ff_id ?? null,
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
    contact_email: profile?.contact_email ?? null,
    game_profiles: Array.isArray(profile?.game_profiles) ? profile?.game_profiles : [],
    selected_frame_id: profile?.selected_frame_id ?? null,
    selected_title: profile?.selected_title ?? null,
    points: profile?.points ?? 0,
    privacy: privRow?.privacy ?? null,
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
  if (d.ff_id !== undefined) updates.ff_id = d.ff_id || null;
  if (d.contact_email !== undefined) updates.contact_email = d.contact_email || null;
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
  if (d.privacy !== undefined) updates.privacy = d.privacy;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
  }

  // Use admin client to bypass RLS so users can update their own profile reliably
  const adminClient = createAdminSupabaseClient();
  const writeClient = (adminClient ?? supabase) as typeof supabase;

  // Retry-without-unknown-columns: when migration hasn't been run on Supabase
  // some optional columns (game_profiles, contact_email, *_url) won't exist
  // yet and PostgREST returns PGRST204 / 42703. Drop the offending column from
  // the payload and retry instead of failing the whole save.
  const COLUMN_ERR = /column ["']?([a-z0-9_]+)["']? .*does not exist|could not find the ['"]?([a-z0-9_]+)['"]? column/i;
  const REQUIRED_COLS = new Set(["display_name"]);
  const remaining = { ...updates };
  let attempts = 0;
  let lastError: { message?: string } | null = null;

  while (Object.keys(remaining).length > 0 && attempts < 12) {
    const { error } = await writeClient
      .from("users")
      .update(remaining as never)
      .eq("id", user.id);
    if (!error) {
      // Check profile/social achievements asynchronously (don't block response)
      void (async () => {
        try {
          const { data: row } = await writeClient
            .from("users")
            .select("avatar_url, bio, ff_id, " + SOCIAL_DEFS.map((s) => s.field).join(", "))
            .eq("id", user.id)
            .maybeSingle();
          if (!row) return;
          const r = row as Record<string, unknown>;
          const socialCount = SOCIAL_DEFS.filter((s) => Boolean(r[s.field])).length;
          await checkProfileAchievements(user.id, {
            avatar_url: r.avatar_url as string | null,
            bio: r.bio as string | null,
            ff_id: r.ff_id as string | null,
            socialCount,
          });
        } catch { /* non-critical */ }
      })();
      return NextResponse.json({ ok: true });
    }
    lastError = error;
    const match = COLUMN_ERR.exec(error.message ?? "");
    const missingCol = match?.[1] ?? match?.[2];
    if (missingCol && remaining[missingCol] !== undefined && !REQUIRED_COLS.has(missingCol)) {
      delete remaining[missingCol];
      attempts += 1;
      continue;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (lastError) {
    return NextResponse.json({ error: lastError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
