import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { performCheckin } from "@/lib/server/checkin";

// POST — điểm danh từ Mini App (dùng tài khoản đã liên kết).
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-checkin", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) return NextResponse.json({ error: "Phiên Telegram không hợp lệ." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: link } = (await untypedFrom(db, "telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", resolved.user.id)
    .maybeSingle()) as { data: { user_id: string } | null };
  if (!link) return NextResponse.json({ error: "Chưa liên kết tài khoản.", needLink: true }, { status: 400 });

  const result = await performCheckin(link.user_id);
  if (!result) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  return NextResponse.json({ ok: true, ...result });
}
