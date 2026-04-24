import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId: z.string().uuid(),
  show: z.boolean(),
});

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "manager" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "No DB." }, { status: 503 });

  const { error } = await (admin as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } } })
    .from("users")
    .update({ show_in_team: parsed.data.show })
    .eq("id", parsed.data.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
