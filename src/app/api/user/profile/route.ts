import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";

const schema = z.object({
  display_name: z.string().min(1).max(80).optional(),
});

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, role, created_at, views")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null; role: string; created_at: string; views: number } | null };

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? "user",
    views: profile?.views ?? 0,
    created_at: profile?.created_at ?? user.created_at,
  });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "user-profile", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const updates: Record<string, string | null> = {};
  if (parsed.data.display_name !== undefined) {
    updates.display_name = parsed.data.display_name || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update(updates as never)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
