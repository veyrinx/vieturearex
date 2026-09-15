import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { signToken, verifyToken } from "@/lib/server/tokens";

/**
 * Mã khôi phục dùng một lần cho /api/admin/ff-items/import.
 *
 * Ký bằng APP_SECRET (qua signToken) nên site mới không cần chung DB hay
 * session với site cũ — chỉ cần chung APP_SECRET là xác minh được chữ ký.
 * Việc "đã dùng chưa" thì chữ ký không tự biết, nên gửi kèm một `jti` ngẫu
 * nhiên, ghi vào bảng ff_items_recovery_tokens, và tiêu nó bằng một UPDATE
 * có điều kiện — hai request cùng lúc chỉ một cái thắng.
 */

const PURPOSE = "ff-items-restore";
const DEFAULT_TTL_SECS = 24 * 3600;

export async function createRecoveryToken(ttlSecs = DEFAULT_TTL_SECS): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const jti = crypto.randomUUID();
  const { error } = await untypedFrom(db, "ff_items_recovery_tokens").insert({ jti } as never);
  if (error) return null;

  return signToken({ jti, purpose: PURPOSE }, ttlSecs);
}

type ConsumeResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "used" };

/** Xác minh chữ ký + hạn dùng, rồi tiêu (đánh dấu used_at) đúng một lần. */
export async function consumeRecoveryToken(token: string): Promise<ConsumeResult> {
  const payload = await verifyToken<{ jti?: string; purpose?: string }>(token);
  if (!payload || payload.purpose !== PURPOSE || typeof payload.jti !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const db = createAdminSupabaseClient();
  if (!db) return { ok: false, reason: "invalid" };

  // Điều kiện `used_at is null` trong chính câu UPDATE: không có khoảng hở
  // giữa "đọc thấy chưa dùng" và "ghi đã dùng" cho hai request chạy song song.
  const { data, error } = await untypedFrom(db, "ff_items_recovery_tokens")
    .update({ used_at: new Date().toISOString() } as never)
    .eq("jti", payload.jti)
    .is("used_at", null)
    .select("jti") as { data: Array<{ jti: string }> | null; error: unknown };

  if (error) return { ok: false, reason: "invalid" };
  if (!data || data.length === 0) return { ok: false, reason: "used" };

  return { ok: true };
}
