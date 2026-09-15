import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createRecoveryToken } from "@/lib/server/ff-items-recovery";

export const dynamic = "force-dynamic";

/**
 * Tạo mã khôi phục dùng một lần cho /api/admin/ff-items/import.
 *
 * Chỉ admin đang đăng nhập được (ở site còn sống) mới tạo được mã. Mã trả về
 * đúng một lần trong response này — không lưu bản rõ ở đâu cả, mất là phải
 * tạo mã khác.
 */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-recovery-token", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const token = await createRecoveryToken();
  if (!token) return NextResponse.json({ error: "Không tạo được mã — kiểm tra Supabase/APP_SECRET." }, { status: 503 });

  await logAdminActivity({
    action: "FF_ITEMS_RECOVERY_TOKEN_CREATED",
    targetType: "FF_ITEMS_CATALOG",
    targetId: "recovery-token",
    summary: "Tạo mã khôi phục dùng một lần cho import catalog FF trên site mới",
    request: req,
  });

  return NextResponse.json({ token, expiresInSecs: 24 * 3600 });
}
