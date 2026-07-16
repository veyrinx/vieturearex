import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

// POST — Mini App gửi mã (đã tạo trên web) để liên kết tài khoản.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-link", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) {
    return NextResponse.json({ error: "Phiên Telegram không hợp lệ.", reason: resolved.reason }, { status: 401 });
  }
  const tgId = resolved.user.id;

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "Thiếu mã liên kết." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: row } = (await untypedFrom(db, "telegram_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", code)
    .maybeSingle()) as { data: { code: string; user_id: string; expires_at: string } | null };

  if (!row) return NextResponse.json({ error: "Mã không đúng hoặc đã dùng." }, { status: 400 });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await untypedFrom(db, "telegram_link_codes").delete().eq("code", code);
    return NextResponse.json({ error: "Mã đã hết hạn. Tạo mã mới trên web." }, { status: 400 });
  }

  // Dọn liên kết cũ (đảm bảo unique cả 2 phía), rồi tạo liên kết mới.
  await untypedFrom(db, "telegram_account_links").delete().eq("user_id", row.user_id);
  await untypedFrom(db, "telegram_account_links").delete().eq("telegram_user_id", tgId);
  const { error } = await untypedFrom(db, "telegram_account_links").insert({
    telegram_user_id: tgId,
    user_id: row.user_id,
  } as never);
  if (error) return NextResponse.json({ error: "Không liên kết được." }, { status: 500 });

  // Mã dùng 1 lần
  await untypedFrom(db, "telegram_link_codes").delete().eq("user_id", row.user_id);

  return NextResponse.json({ ok: true });
}

// DELETE — hủy liên kết cho telegram user hiện tại.
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-unlink", limit: 15, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) return NextResponse.json({ error: "Phiên Telegram không hợp lệ." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "telegram_account_links").delete().eq("telegram_user_id", resolved.user.id);
  return NextResponse.json({ ok: true });
}
