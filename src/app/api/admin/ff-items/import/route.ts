import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { parseItemsJson } from "@/lib/constants/ff-items-import";
import { consumeRecoveryToken } from "@/lib/server/ff-items-recovery";

export const dynamic = "force-dynamic";

/**
 * Nạp kho vật phẩm từ file JSON tải lên.
 *
 * Khác `/api/admin/ff-items/catalog` ở chỗ: route kia nhận đúng dạng đã chuẩn
 * hoá, tối đa 200 dòng, giới hạn 20 lượt/phút — file thật có 34 nghìn dòng, đi
 * đường đó là 172 lượt gọi, chạm trần tốc độ ngay lô thứ hai mươi mốt. Route
 * này nhận thẳng JSON thô (mảng object, mảng ID, hay object tra cứu — xem
 * `parseItemsJson`) với lô lớn hơn nhiều.
 *
 * Mặc định KHÔNG ghi đè: tên và nhóm mà người trực đã sửa tay trong catalog
 * quý hơn tên máy móc trong file. Muốn ghi đè thì gửi `overwrite: true`.
 *
 * Xác thực có hai đường:
 *  1. Phiên admin bình thường (mặc định).
 *  2. Header `x-recovery-token` — mã dùng-một-lần tạo từ
 *     /api/admin/ff-items/recovery-token, cho site MỚI dựng lên chưa có
 *     session/tài khoản admin nào hoạt động (khôi phục sau sự cố). Có mã hợp
 *     lệ thì bỏ qua hẳn bước session, không rơi ngược lại kiểm tra thường.
 */

/** Trần một lượt gọi. 2000 dòng ≈ 300KB JSON, Supabase upsert thoải mái. */
const MAX_ROWS = 2000;

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-import", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const recoveryToken = req.headers.get("x-recovery-token");
  let userId: string | null = null;

  if (recoveryToken) {
    const result = await consumeRecoveryToken(recoveryToken);
    if (!result.ok) {
      const message = result.reason === "used"
        ? "Mã khôi phục đã được dùng."
        : "Mã khôi phục không hợp lệ hoặc hết hạn.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
    // Xác thực xong qua mã — không có user thật đứng sau, để null.
  } else {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
    if (denied) return denied;

    const supabase = createServerSupabaseClient();
    const { data: { user } = { user: null } } = supabase
      ? await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      : { data: { user: null } };
    if (!user) return NextResponse.json({ error: "Unauth" }, { status: 401 });
    userId = user.id;
  }

  const body = (await req.json().catch(() => null)) as
    | { data?: unknown; overwrite?: boolean; dryRun?: boolean }
    | null;
  if (!body || body.data === undefined) {
    return NextResponse.json({ error: "Thiếu trường `data` (nội dung file JSON)." }, { status: 400 });
  }

  const { items, skipped } = parseItemsJson(body.data);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Không rút được ID vật phẩm nào từ file. Kiểm tra lại định dạng JSON." },
      { status: 400 },
    );
  }
  if (items.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Tối đa ${MAX_ROWS} mục mỗi lượt — chia nhỏ file rồi gửi tiếp.` },
      { status: 413 },
    );
  }

  // Chỉ xem thử: trả về những gì đọc được, không ghi gì.
  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      parsed: items.length,
      skipped,
      sample: items.slice(0, 10),
      ids: items.map((i) => i.id),
    });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const rows = items.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    is_public: true,
    created_by: userId,
  }));

  const { error } = await untypedFrom(db, "ff_items_catalog").upsert(rows as never, {
    onConflict: "id",
    ignoreDuplicates: !body.overwrite,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    imported: rows.length,
    skipped,
    ids: items.map((i) => i.id),
  });
}
