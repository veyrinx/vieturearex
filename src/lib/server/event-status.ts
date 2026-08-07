import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { untypedFrom } from "@/lib/supabase/untyped";
import { vietnamDayStartIso } from "@/lib/utils/vietnam-time";

/**
 * Đồng bộ cột `status` của bảng events với thực tế theo giờ Việt Nam.
 *
 * Trang web đã tự suy trạng thái lúc đọc (`getEventStatusInVietnam`), nên cột
 * này chỉ là bản sao cho những chỗ đọc thẳng DB: tìm kiếm, báo cáo, app.
 * Trước đây cột chỉ được ghi lúc admin tạo/sửa nên "sắp diễn ra" nằm đó mãi.
 * Hàm này chạy định kỳ để ba trạng thái tự chuyển, không cần ai bấm.
 *
 * Quy ước NGÀY (giống hàm suy lúc đọc, không so timestamp):
 *   - kết thúc  : ngày kết thúc đã qua      → end_date   < 00:00 hôm nay
 *   - sắp diễn ra: ngày bắt đầu chưa tới    → start_date ≥ 00:00 ngày mai
 *   - đang diễn ra: còn lại
 * Nhờ vậy sự kiện kết thúc "hôm nay" vẫn được tính là đang diễn ra cả ngày.
 */

export type EventStatusSync = {
  active: number;
  upcoming: number;
  expired: number;
  changed: number;
};

export async function syncEventStatuses(
  db: SupabaseClient,
  now: Date = new Date(),
): Promise<EventStatusSync> {
  const todayStart = vietnamDayStartIso(0, now);
  const tomorrowStart = vietnamDayStartIso(1, now);
  const result: EventStatusSync = { active: 0, upcoming: 0, expired: 0, changed: 0 };

  /** Chạy một câu UPDATE rồi đếm số dòng đổi. Lỗi thì trả 0, không ném. */
  const count = async (build: () => PromiseLike<unknown>) => {
    try {
      const res = (await build()) as { data?: Array<{ id: string }> | null };
      return res?.data?.length ?? 0;
    } catch {
      // Bảng/cột thiếu (bản demo, DB chưa migrate) — bỏ qua, không làm hỏng cron.
      return 0;
    }
  };

  result.expired = await count(() =>
    untypedFrom(db, "events")
      .update({ status: "expired" })
      .lt("end_date", todayStart)
      .neq("status", "expired")
      .select("id"),
  );

  result.upcoming = await count(() =>
    untypedFrom(db, "events")
      .update({ status: "upcoming" })
      .gte("start_date", tomorrowStart)
      .neq("status", "upcoming")
      .select("id"),
  );

  result.active = await count(() =>
    untypedFrom(db, "events")
      .update({ status: "active" })
      .lt("start_date", tomorrowStart)
      .gte("end_date", todayStart)
      .neq("status", "active")
      .select("id"),
  );

  result.changed = result.active + result.upcoming + result.expired;
  return result;
}
