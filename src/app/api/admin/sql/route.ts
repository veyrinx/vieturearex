import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-sql", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const auth = await getAuthContext();
  if (auth.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const sql = typeof payload?.sql === "string" ? payload.sql.trim() : "";
  if (!sql) {
    return NextResponse.json({ error: "Missing SQL query." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  type UntypedClient = { rpc: (fn: string, args: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }> };
  const { data, error } = await (supabase as unknown as UntypedClient).rpc("exec_sql", { query: sql });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminActivity({
    action: "SQL_EXECUTED",
    targetType: "SYSTEM",
    targetId: "sql",
    summary: `SQL: ${sql.slice(0, 200)}`,
  }).catch(() => {});

  return NextResponse.json({ data: data ?? [] });
}
