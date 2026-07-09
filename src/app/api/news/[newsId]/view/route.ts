import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ newsId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "news-view", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { newsId } = await params;
  if (!newsId) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const db = createAdminSupabaseClient();
    if (db) {
      await (db as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }> })
        .rpc("increment_news_views", { news_id: newsId });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true });
}
