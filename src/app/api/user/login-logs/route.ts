import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit, getClientIp } from "@/lib/server/api-guard";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "login-logs-get", limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ logs: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Bypass RLS via admin client when available
  const adminClient = createAdminSupabaseClient();
  const readClient = (adminClient ?? supabase) as typeof supabase;

  const { data } = await readClient
    .from("login_logs")
    .select("id, ip, user_agent, method, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30) as { data: Array<{ id: string; ip: string | null; user_agent: string | null; method: string; created_at: string }> | null };

  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "login-log", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ ok: false });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? null;
  const body = await request.json().catch(() => ({})) as { method?: string };
  const method = body.method === "google" ? "google" : "password";

  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !supabaseUrl) return NextResponse.json({ ok: true });

  const db = createClient(supabaseUrl, serviceKey);
  try {
    await db.from("login_logs").insert({
      user_id: user.id,
      email: user.email ?? "",
      ip: ip !== "unknown" ? ip : null,
      user_agent: ua,
      method,
    } as never);
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true });
}
