import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "player-search", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ players: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ players: [] });

  const sb = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!sb) return NextResponse.json({ players: [] });

  const { data } = await (sb.from("users") as ReturnType<typeof sb.from>)
    .select("id, display_name, avatar_url, ff_id")
    .or(`display_name.ilike.%${q}%,ff_id.ilike.%${q}%`)
    .limit(10) as {
      data: Array<{ id: string; display_name: string | null; avatar_url: string | null; ff_id: string | null }> | null;
    };

  return NextResponse.json({ players: data ?? [] });
}
