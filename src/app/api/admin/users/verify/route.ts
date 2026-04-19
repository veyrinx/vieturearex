import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminActivity } from "@/lib/server/admin-activity";

const schema = z.object({
  id: z.string().min(1),
  is_verified: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-verify", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  // Only IT can grant/revoke verified badge
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { error } = await (supabase.from("users") as ReturnType<typeof supabase.from>)
    .update({ is_verified: parsed.data.is_verified } as never)
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "42703") {
      return NextResponse.json({ error: "Cột is_verified chưa được tạo trong Supabase. Chạy: ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminActivity({
    action: parsed.data.is_verified ? "USER_VERIFIED" : "USER_UNVERIFIED",
    targetType: "USER",
    targetId: parsed.data.id,
    summary: `${parsed.data.is_verified ? "Cấp" : "Thu hồi"} tích xanh cho người dùng ${parsed.data.id}`,
  });

  return NextResponse.json({ ok: true });
}
