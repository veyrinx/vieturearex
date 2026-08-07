import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncEventStatuses } from "@/lib/server/event-status";

/**
 * Tự chuyển sự kiện giữa "sắp diễn ra → đang diễn ra → đã kết thúc".
 *
 * Lịch `0 17 * * *` UTC = 00:00 giờ VN, đúng lúc trạng thái đổi. Gói Hobby chỉ
 * cho cron chạy một lần/ngày và sai số tới ±59 phút, nên trong khoảng đầu ngày
 * cột `status` có thể còn cũ vài chục phút — không sao, trang web luôn tự suy
 * lại lúc đọc (`getEventStatusInVietnam`). Cron này chỉ lo phần dữ liệu nằm
 * trong DB cho tìm kiếm, báo cáo và app đọc thẳng bảng.
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
