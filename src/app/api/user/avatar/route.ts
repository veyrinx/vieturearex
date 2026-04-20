import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { enforceRateLimit } from "@/lib/server/api-guard";

const BUCKET = "avatars";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-avatar", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ảnh tối đa 5MB." }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/avatar.${ext}`;

  // Use admin client to bypass storage RLS — auth already verified above
  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable." }, { status: 503 });

  // Remove any existing avatar files for this user before upload
  const { data: existing } = await admin.storage.from(BUCKET).list(user.id);
  if (existing && existing.length > 0) {
    const toRemove = existing.map((f) => `${user.id}/${f.name}`);
    await admin.storage.from(BUCKET).remove(toRemove);
  }

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  // Update users table
  const { error: dbError } = await admin
    .from("users")
    .update({ avatar_url: avatarUrl } as never)
    .eq("id", user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: avatarUrl }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-avatar", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Supabase chưa được cấu hình." }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Admin client unavailable." }, { status: 503 });

  // Remove all files in user's avatar folder
  const { data: existing } = await admin.storage.from(BUCKET).list(user.id);
  if (existing && existing.length > 0) {
    const toRemove = existing.map((f) => `${user.id}/${f.name}`);
    await admin.storage.from(BUCKET).remove(toRemove);
  }

  const { error: dbError } = await admin
    .from("users")
    .update({ avatar_url: null } as never)
    .eq("id", user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
