import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { getTmsTeam, updateTeamInfo } from "@/lib/tms/data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTmsTeam(id).catch(() => null);
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    logo_url?: string | null;
    is_public?: boolean;
  };

  const adminRoles = ["super_admin", "admin", "it", "manager"];
  const isAdmin = adminRoles.includes(auth.role);

  if (isAdmin) {
    const db = createAdminSupabaseClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
    const { data, error } = await untypedFrom(db, "tms_teams")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  // Captain can update name + logo_url only
  const { name, logo_url } = body;
  if (!name && logo_url === undefined) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }
  const input: { name?: string; logo_url?: string | null } = {};
  if (name) input.name = name.trim().slice(0, 40);
  if (logo_url !== undefined) input.logo_url = logo_url;

  try {
    const team = await updateTeamInfo(id, auth.userId, input);
    return NextResponse.json(team);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi cập nhật";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
