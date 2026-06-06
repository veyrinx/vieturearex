import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

// GET ?names=alice,bob,charlie OR ?q=alice (autocomplete)
// Returns map { username_lowercase: user_id } and optional list for autocomplete
export async function GET(req: NextRequest) {
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ users: {}, suggestions: [] });

  const url = new URL(req.url);
  const namesParam = url.searchParams.get("names");
  const q = url.searchParams.get("q");

  if (namesParam) {
    const names = namesParam
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30);

    if (names.length === 0) return NextResponse.json({ users: {} });

    // Fetch users whose display_name (lowercased) matches any of the names
    // Use ilike for case-insensitive match
    const orClause = names.map((n) => `display_name.ilike.${n}`).join(",");
    const { data } = await untypedFrom(db, "users")
      .select("id, display_name")
      .or(orClause)
      .limit(60) as { data: Array<{ id: string; display_name: string | null }> | null };

    const map: Record<string, string> = {};
    for (const user of data ?? []) {
      const lower = (user.display_name ?? "").toLowerCase();
      if (lower && names.includes(lower) && !map[lower]) {
        map[lower] = user.id;
      }
    }
    return NextResponse.json({ users: map });
  }

  if (q) {
    const query = q.trim();
    if (!query) return NextResponse.json({ suggestions: [] });

    const { data } = await untypedFrom(db, "users")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `${query}%`)
      .not("display_name", "is", null)
      .limit(8) as { data: Array<{ id: string; display_name: string | null; avatar_url: string | null }> | null };

    return NextResponse.json({
      suggestions: (data ?? [])
        .filter((u) => !!u.display_name)
        .map((u) => ({ id: u.id, name: u.display_name, avatar: u.avatar_url })),
    });
  }

  return NextResponse.json({ users: {}, suggestions: [] });
}
