import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTeam } from "@/lib/tms/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTmsTeam(id).catch(() => null);
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  const adminRoles = ["super_admin", "admin", "it", "manager"];
  if (!auth.userId || !adminRoles.includes(auth.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { is_public?: boolean };

  const sb = createServerSupabaseClient();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await untypedFrom(sb, "tms_teams")
    .update({ is_public: body.is_public })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
