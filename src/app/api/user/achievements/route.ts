import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json([]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const client = createAdminSupabaseClient() ?? supabase;

  const { data } = await untypedFrom(client, "user_achievements")
    .select("achievement, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: true }) as { data: { achievement: string; earned_at: string }[] | null };

  return NextResponse.json(data ?? []);
}
