import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";
import { vietnamDayStartIso } from "@/lib/utils/vietnam-time";

const SETTING_ENABLED = "cron.purge_expired_events_enabled";
const SETTING_GRACE_DAYS = "cron.purge_expired_events_grace_days";

/**
 * Giữ sự kiện đã kết thúc thêm bao nhiêu ngày trước khi xoá hẳn.
 *
 * Trước đây mặc định là 0, tức sự kiện vừa hết là chuyến cron 3h30 sáng hôm đó
 * xoá luôn — trạng thái "đã kết thúc" gần như không bao giờ nhìn thấy. Đổi
 * thành 30 ngày để ba trạng thái sắp/đang/kết thúc đều có ý nghĩa; admin muốn
 * xoá sớm hơn thì chỉnh `cron.purge_expired_events_grace_days` ở /admin/settings.
 */
const DEFAULT_GRACE_DAYS = 30;

/** Thông tin bàn giao acc bị xoá sau ngần này ngày kể từ khi đơn khép lại. */
const SECRET_RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  
  const enabled = map[SETTING_ENABLED] !== "false";
  if (!enabled) return NextResponse.json({ ok: true, skipped: "disabled" });

  const graceRaw = parseInt(map[SETTING_GRACE_DAYS] ?? "", 10);
  const graceDays = Number.isFinite(graceRaw) && graceRaw >= 0 ? graceRaw : DEFAULT_GRACE_DAYS;
  // Đếm lùi từ 00:00 giờ VN chứ không từ "bây giờ", để khớp với cách tính
  // trạng thái theo ngày ở event-status.ts — sự kiện kết thúc hôm nay vẫn còn.
  const cutoff = vietnamDayStartIso(-graceDays);

  let deleted = 0;
  try {
    const { data, error } = await untypedFrom(db, "events")
      .delete()
      .lt("end_date", cutoff)
      .select("id") as { data: Array<{ id: string }> | null; error: unknown };
    if (error) {
      console.error("[cron purge-expired] delete failed:", error);
      return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
    deleted = data?.length ?? 0;
  } catch (e) {
    console.error("[cron purge-expired] threw:", e);
    return NextResponse.json({ ok: false, error: "exception" }, { status: 500 });
  }

  if (deleted > 0) {
    revalidatePath("/", "layout");
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
  }

  // ── Chợ Arex: xoá thông tin đăng nhập đã bàn giao của đơn đã khép ──
  // Mật khẩu tài khoản game không có lý do gì nằm lại trong DB sau khi đơn
  // xong; ảnh và nhật ký vẫn giữ nguyên làm bằng chứng.
  let secretsPurged = 0;
  try {
    const { data: closed } = (await untypedFrom(db, "shop_orders")
      .select("id")
      .in("status", ["completed", "cancelled"])
      .lt("updated_at", new Date(Date.now() - SECRET_RETENTION_DAYS * 86_400_000).toISOString())
      .limit(500)) as { data: Array<{ id: string }> | null };

    const ids = (closed ?? []).map((o) => o.id);
    if (ids.length > 0) {
      const { data } = (await untypedFrom(db, "shop_order_events")
        .update({ secret: null })
        .in("order_id", ids)
        .not("secret", "is", null)
        .select("id")) as { data: Array<{ id: string }> | null };
      secretsPurged = data?.length ?? 0;
    }
  } catch {
    /* bảng chưa migrate — bỏ qua */
  }

  // ── Dọn bộ đếm đăng nhập sai ──
  // Đăng nhập được thì dòng tự bị xoá; còn lại là IP gõ sai vài lần rồi bỏ đi,
  // và những lệnh khoá đã hết hạn. Không dọn thì bảng chỉ có phình.
  let loginAttemptsPurged = 0;
  try {
    const staleCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = (await untypedFrom(db, "login_attempts")
      .delete()
      .or(`and(banned_until.is.null,last_attempt.lt.${staleCutoff}),banned_until.lt.${new Date().toISOString()}`)
      .select("ip")) as { data: Array<{ ip: string }> | null };
    loginAttemptsPurged = data?.length ?? 0;
  } catch {
    /* bảng chưa migrate — bỏ qua */
  }

  return NextResponse.json({ ok: true, deleted, graceDays, secretsPurged, loginAttemptsPurged });
}
