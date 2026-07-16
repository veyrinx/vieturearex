import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const TTL_MS = 10 * 60_000; // 10 phút
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm

function genCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// POST — người dùng đã đăng nhập trên web tạo mã liên kết Telegram.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-link-code", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Hãy đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Xóa mã cũ của user rồi tạo mã mới
  await untypedFrom(db, "telegram_link_codes").delete().eq("user_id", user.id);

  const code = genCode();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const { error } = await untypedFrom(db, "telegram_link_codes").insert({
    code,
    user_id: user.id,
    expires_at: expiresAt,
  } as never);
  if (error) return NextResponse.json({ error: "Không tạo được mã." }, { status: 500 });

  return NextResponse.json({ code, expiresInSec: Math.floor(TTL_MS / 1000) });
}
