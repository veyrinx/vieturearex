import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const schema = z.object({ email: z.string().email().max(160) });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "newsletter", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const email = parsed.data.email.trim().toLowerCase();
  const { error } = await untypedFrom(db, "newsletter_subscribers")
    .upsert({ email } as never, { onConflict: "email", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
