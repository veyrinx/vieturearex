import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTeam, getMyTmsTeam, joinTeam } from "@/lib/tms/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;

  const [team, existing] = await Promise.all([
    getTmsTeam(id).catch(() => null),
    getMyTmsTeam(auth.userId).catch(() => null),
  ]);

  if (!team) return NextResponse.json({ error: "Team không tồn tại." }, { status: 404 });
  if (existing) return NextResponse.json({ error: "Bạn đã thuộc một team khác." }, { status: 409 });

  // Check FF ID is set
  const sb = createServerSupabaseClient();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const { data: user } = await untypedFrom(sb, "users")
    .select("ff_id, display_name")
    .eq("id", auth.userId)
    .single() as { data: { ff_id: string | null; display_name: string | null } | null };

  if (!user?.ff_id || !user?.display_name) {
    return NextResponse.json({ error: "setup_required" }, { status: 403 });
  }

  try {
    await joinTeam(id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
