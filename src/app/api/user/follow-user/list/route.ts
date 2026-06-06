import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type UserLite = { id: string; display_name: string | null; avatar_url: string | null; role: string | null };

// GET ?target=<uuid>&type=followers|following
// Returns list of users
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get("target");
  const type = url.searchParams.get("type") ?? "followers";

  if (!target) return NextResponse.json({ users: [] });
  if (type !== "followers" && type !== "following") {
    return NextResponse.json({ users: [] });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ users: [] });

  // followers = people who follow `target` (follower_id list where following_id=target)
  // following = people that `target` follows (following_id list where follower_id=target)
  const idColumn = type === "followers" ? "following_id" : "follower_id";
  const otherColumn = type === "followers" ? "follower_id" : "following_id";

  const { data: rows } = await untypedFrom(db, "user_user_follows")
    .select(`${otherColumn}, created_at`)
    .eq(idColumn, target)
    .order("created_at", { ascending: false })
    .limit(100) as { data: Array<Record<string, string>> | null };

  const ids = (rows ?? []).map((r) => r[otherColumn]).filter((x): x is string => !!x);
  if (ids.length === 0) return NextResponse.json({ users: [] });

  const { data: users } = await untypedFrom(db, "users")
    .select("id, display_name, avatar_url, role")
    .in("id", ids) as { data: UserLite[] | null };

  // Preserve order from rows
  const byId = new Map<string, UserLite>((users ?? []).map((u) => [u.id, u]));
  const ordered = ids.map((id) => byId.get(id)).filter((x): x is UserLite => !!x);

  return NextResponse.json({ users: ordered });
}
