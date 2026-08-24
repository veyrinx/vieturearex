import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getAuthContext } from "@/lib/server/auth";
import { isShopAdminRole, listOrders } from "@/lib/server/shop";
import { notifyStaleOrders } from "@/lib/server/shop-notify";
import { hoursSince, isOrderStale, orderLastMoved } from "@/lib/constants/shop";
import { withCron } from "@/lib/server/ops-log";

/**
 * Quét đơn chợ đang treo và nhắc người phụ trách.
 *
 * "Treo" = đơn còn chạy nhưng không nhúc nhích quá ngưỡng của bước hiện tại
 * (xem STALE_ORDER_HOURS). Bàn admin đã hiện con số này, nhưng con số chỉ có
 * tác dụng khi có người mở tab lên xem — cron mới là thứ khiến nó tự tìm đến
 * giao dịch viên.
 *
 * Chống lặp: mỗi đơn chỉ bị nhắc lại sau REPING_HOURS. Trạng thái cất trong
 * bảng `settings` dưới dạng JSON `{ orderId: mốc nhắc gần nhất }` — cùng cách
 * bxh-rank-notify đang làm, nên không phải thêm cột vào shop_orders.
 *
 * Gọi được bằng hai đường: Vercel Cron (Bearer CRON_SECRET) hoặc admin chợ bấm
 * tay từ /admin/shop.
 */

const STATE_KEY = "shop.stale_pings";
const DEFAULT_REPING_HOURS = 12;

type PingState = Record<string, string>;

async function readState(db: NonNullable<ReturnType<typeof createAdminSupabaseClient>>): Promise<PingState> {
  const { data } = (await untypedFrom(db, "settings")
    .select("value")
    .eq("key", STATE_KEY)
    .maybeSingle()) as { data: { value: string } | null };
  try {
    return data?.value ? (JSON.parse(data.value) as PingState) : {};
  } catch {
    return {};
  }
}

// Route này gửi Discord + push, nên không để hở như mấy cron chỉ dọn dữ liệu:
// chưa cấu hình CRON_SECRET thì vẫn phải là lịch của Vercel (header
// `x-vercel-cron`) hoặc admin bấm tay, chứ không phải ai gọi cũng chạy.
async function authorize(req: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const fromCron = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : !!req.headers.get("x-vercel-cron");
  if (fromCron) return null;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export const GET = withCron("shop-stale-orders", async () => {
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const repingHours = Number(process.env.SHOP_STALE_REPING_HOURS) || DEFAULT_REPING_HOURS;

  const active = await listOrders({ onlyActive: true, limit: 500 });
  const stale = active.filter(isOrderStale);

  const state = await readState(db);
  const now = new Date().toISOString();

  // Chỉ nhắc đơn chưa nhắc bao giờ, hoặc đã nhắc từ lâu.
  const due = stale.filter((o) => {
    const last = state[o.id];
    return !last || hoursSince(last) >= repingHours;
  });

  if (due.length > 0) await notifyStaleOrders(due);

  // Dọn luôn những đơn đã hết treo — nếu không, bảng state phình theo thời gian
  // và đơn cũ quay lại trạng thái treo sẽ bị coi là "vừa nhắc rồi".
  const next: PingState = {};
  for (const o of stale) next[o.id] = due.some((d) => d.id === o.id) ? now : state[o.id] ?? now;

  await untypedFrom(db, "settings").upsert(
    { key: STATE_KEY, value: JSON.stringify(next), updated_at: now } as never,
    { onConflict: "key" },
  );

  return NextResponse.json({
    ok: true,
    scanned: active.length,
    stale: stale.length,
    pinged: due.length,
    repingHours,
    worst: due
      .map((o) => ({ code: o.code, status: o.status, idleHours: Math.round(hoursSince(orderLastMoved(o))) }))
      .sort((a, b) => b.idleHours - a.idleHours)
      .slice(0, 5),
  });
}, { authorize });
