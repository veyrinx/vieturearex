import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { enforceRateLimit } from "@/lib/server/api-guard";

const BUCKET = "avatars";
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-banner", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv) return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Chỉ chấp nhận JPEG, PNG, WebP." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Ảnh bìa tối đa 8MB." }, { status: 400 });

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/banner.${ext}`;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable." }, { status: 503 });

  // Remove old banner files
  const { data: existing } = await admin.storage.from(BUCKET).list(user.id);
  if (existing) {
    const bannerFiles = existing.filter((f) => f.name.startsWith("banner."));
    if (bannerFiles.length > 0) {
      await admin.storage.from(BUCKET).remove(bannerFiles.map((f) => `${user.id}/${f.name}`));
    }
  }

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const bannerUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await admin
    .from("users")
    .update({ banner_url: bannerUrl } as never)
    .eq("id", user.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ banner_url: bannerUrl });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-banner", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv) return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable." }, { status: 503 });

  const { data: existing } = await admin.storage.from(BUCKET).list(user.id);
  if (existing) {
    const bannerFiles = existing.filter((f) => f.name.startsWith("banner."));
    if (bannerFiles.length > 0) {
      await admin.storage.from(BUCKET).remove(bannerFiles.map((f) => `${user.id}/${f.name}`));
    }
  }

  await admin.from("users").update({ banner_url: null } as never).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
