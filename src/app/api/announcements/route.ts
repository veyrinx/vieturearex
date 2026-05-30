import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "announcements", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ announcements: [] });

  const now = new Date().toISOString();
  const { data } = await (untypedFrom(db, "system_announcements")
    .select("id, title, message, type")
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(3) as unknown as Promise<{ data: Array<{ id: string; title: string; message: string; type: string }> | null }>);

  return NextResponse.json({ announcements: data ?? [] });
}
