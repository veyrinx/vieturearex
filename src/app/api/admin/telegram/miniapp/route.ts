import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { broadcastToSubscribers } from "@/lib/server/telegram-broadcast";

// GET — subscriber stats
export async function GET() {
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ active: 0, total: 0 });

  const [activeRes, totalRes] = await Promise.all([
    untypedFrom(db, "telegram_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    untypedFrom(db, "telegram_subscribers")
      .select("id", { count: "exact", head: true }),
  ]) as [{ count: number | null }, { count: number | null }];

  return NextResponse.json({
    active: activeRes.count ?? 0,
    total: totalRes.count ?? 0,
  });
}

// POST — actions: broadcast_test | cleanup
export async function POST(req: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === "broadcast_test") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site";
    await broadcastToSubscribers(
      `🔔 <b>Test thông báo từ Mini App</b>\n\nĐây là tin nhắn thử nghiệm từ admin. Hệ thống thông báo đang hoạt động!\n\n<a href="${siteUrl}/tg">🎮 Mở Mini App</a>`,
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cleanup") {
    const db = createAdminSupabaseClient();
    if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });
    const { count } = await untypedFrom(db, "telegram_subscribers")
      .delete({ count: "exact" })
      .eq("active", false) as { count: number | null };
    return NextResponse.json({ ok: true, removed: count ?? 0 });
  }

  return NextResponse.json({ ok: false, reason: "unknown_action" }, { status: 400 });
}
