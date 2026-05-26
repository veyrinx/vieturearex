import { NextRequest, NextResponse } from "next/server";
import { getAdminActivityLogs } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-logs", limit: 80, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ capability: "logs.view" });
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const action = searchParams.get("action") ?? "";

  // If date range requested, query directly with filters
  if ((from || to || action) && createAdminSupabaseClient()) {
    try {
      const db = createAdminSupabaseClient()!;
      let query = db
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (from) query = query.gte("created_at", new Date(from).toISOString()) as typeof query;
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString()) as typeof query;
      }
      if (action) query = query.ilike("action", `%${action}%`) as typeof query;

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ logs: data ?? [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load logs.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const logs = await getAdminActivityLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
