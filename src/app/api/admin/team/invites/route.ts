import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createSchema = z.object({
  label: z.string().max(80).optional(),
  expiresInDays: z.number().int().min(1).max(30).optional().default(7),
  maxUses: z.number().int().min(1).max(500).optional().default(1),
});

type InviteRow = {
  id: string;
  token: string;
  label: string | null;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data, error } = await admin
    .from("team_invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invites: (data ?? []) as InviteRow[] });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "team-invite", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "team.invite" });
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("team_invites")
    .insert({
      token,
      label: parsed.data.label ?? null,
      created_by: user?.id ?? null,
      expires_at: expiresAt,
      max_uses: parsed.data.maxUses,
    } as never)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = request.nextUrl.origin;
  return NextResponse.json({
    invite: data,
    url: `${origin}/team-join/${token}`,
  });
}

export async function DELETE(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "team.invite" });
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { error } = await admin.from("team_invites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
