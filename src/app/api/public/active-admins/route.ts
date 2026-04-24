import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";

const ONLINE_WINDOW_MS = 90_000;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "public-active-admins", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ admins: [] });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { data } = await supabase
      .from("users")
      .select("display_name")
      .in("role", ["super_admin", "admin", "it", "manager", "support"])
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(10) as { data: Array<{ display_name: string | null }> | null };

    const admins = (data ?? [])
      .map((u) => u.display_name)
      .filter(Boolean) as string[];

    return NextResponse.json({ admins }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ admins: [] });
  }
}
