import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "event-view", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { id } = params;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !supabaseUrl) return NextResponse.json({ ok: true });

  const db = createClient(supabaseUrl, serviceKey);
  try { await db.rpc("increment_event_views", { event_id: id }); } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true });
}
