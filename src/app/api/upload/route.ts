import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { rateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/get-client-ip";

const ALLOWED_BUCKETS = ["logos", "forum"] as const;

export async function POST(request: NextRequest) {
  const key = `user-upload:${getClientIp(request)}`;
  const rl = rateLimit(key, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const rawBucket = String(formData.get("bucket") ?? "logos");
  const bucket = (ALLOWED_BUCKETS as readonly string[]).includes(rawBucket) ? rawBucket : "logos";

  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads allowed." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 400 });

  const adminClient = createAdminSupabaseClient() ?? supabase;
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicData } = adminClient.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ publicUrl: publicData.publicUrl }, { status: 201 });
}
