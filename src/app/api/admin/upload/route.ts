import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-upload", limit: 25, windowMs: 60_000 });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase chưa được cấu hình. Hãy dùng ảnh URL trực tiếp trong chế độ local." },
      { status: 400 },
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const bucket = String(formData.get("bucket") ?? "gallery");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ publicUrl: publicData.publicUrl }, { status: 201 });
}
