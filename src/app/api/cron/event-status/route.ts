import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncEventStatuses } from "@/lib/server/event-status";

/**
 * Tự chuyển sự kiện giữa "sắp diễn ra → đang diễn ra → đã kết thúc".
 *
 * Mốc chuyển là nửa đêm giờ VN, nên chạy mỗi giờ là dư sức bắt kịp mà vẫn rẻ
 * (ba câu UPDATE có điều kiện, không đụng gì khi không có sự kiện nào đổi).
 * Trang web vẫn tự suy trạng thái lúc đọc — cron này lo phần dữ liệu trong DB
 * cho tìm kiếm, báo cáo và app đọc thẳng bảng.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const synced = await syncEventStatuses(db);

  // Chỉ xoá cache khi thật sự có sự kiện đổi trạng thái.
  if (synced.changed > 0) {
    revalidatePath("/", "layout");
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
  }

  return NextResponse.json({ ok: true, synced });
}
