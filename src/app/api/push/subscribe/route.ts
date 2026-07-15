import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type SubBody = { endpoint?: string } & Record<string, unknown>;

// POST — lưu / cập nhật 1 subscription (theo endpoint)
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-subscribe", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const sub = (await request.json().catch(() => null)) as SubBody | null;
  if (!sub?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "push_subscriptions")
    .upsert({ endpoint: sub.endpoint, subscription: sub } as never, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — gỡ subscription theo endpoint
export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-subscribe", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const sub = (await request.json().catch(() => null)) as SubBody | null;
  if (!sub?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "push_subscriptions").delete().eq("endpoint", sub.endpoint);
  return NextResponse.json({ ok: true });
}
