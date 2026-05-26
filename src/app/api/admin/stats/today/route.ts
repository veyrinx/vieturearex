import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function vnDateStart(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00+07:00`;
}

export async function GET() {
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ newUsers: 0, newNews: 0, newEvents: 0, pendingComments: 0, pendingEvents: 0 });

  const todayStart = vnDateStart();

  const [usersRes, newsRes, eventsRes, pendingNewsRes, pendingEventsRes] = await Promise.allSettled([
    db.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("news").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("events").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    db.from("news_comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("event_comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  function extractCount(res: PromiseSettledResult<{ count: number | null }>): number {
    return res.status === "fulfilled" ? (res.value.count ?? 0) : 0;
  }

  return NextResponse.json({
    newUsers:       extractCount(usersRes as PromiseSettledResult<{ count: number | null }>),
    newNews:        extractCount(newsRes as PromiseSettledResult<{ count: number | null }>),
    newEvents:      extractCount(eventsRes as PromiseSettledResult<{ count: number | null }>),
    pendingComments: extractCount(pendingNewsRes as PromiseSettledResult<{ count: number | null }>) +
                     extractCount(pendingEventsRes as PromiseSettledResult<{ count: number | null }>),
  });
}
