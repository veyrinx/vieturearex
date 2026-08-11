import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ACTIVE_ORDER_STATUSES, isOrderStale, type OrderStatus } from "@/lib/constants/shop";

/**
 * Bảng công của giao dịch viên.
 *
 * Đọc thẳng từ `shop_orders` chứ không giữ bảng tổng hợp riêng: số đơn của chợ
 * còn nhỏ, mà một bảng tổng hợp sai lệch thì tệ hơn nhiều so với một truy vấn
 * hơi nặng chạy mỗi lần admin mở tab.
 *
 * Mọi con số đều tính trong một cửa sổ thời gian. Trung bình trọn đời của một
 * người làm 300 đơn sẽ không bao giờ nhúc nhích dù tuần này họ bỏ bê — thứ cần
 * nhìn là "30 ngày qua làm ăn thế nào".
 */

type OrderRow = {
  id: string;
  agent_id: string | null;
  status: OrderStatus;
  amount: number;
  fee: number;
  created_at: string;
  claimed_at: string | null;
  held_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

export type AgentStat = {
  agentId: string;
  name: string;
  role: string;
  /** Đơn đang ôm (chưa xong, chưa huỷ). */
  active: number;
  /** Trong số đang ôm, bao nhiêu đơn đã đứng yên quá ngưỡng. */
  stale: number;
  claimed: number;
  completed: number;
  cancelled: number;
  disputed: number;
  gmv: number;
  fee: number;
  /** Giờ trung bình từ lúc đơn tạo tới lúc nhận. `null` = chưa có mẫu. */
  avgClaimHours: number | null;
  /** Giờ trung bình từ lúc nhận tới lúc hoàn tất. */
  avgCompleteHours: number | null;
  /** Lần cuối người này chạm vào một đơn nào đó. */
  lastActiveAt: string | null;
};

export type AgentDeskReport = {
  days: number;
  agents: AgentStat[];
  /** Đơn chưa ai nhận trong cửa sổ — sức khoẻ của hàng chờ. */
  unclaimed: number;
  /** Đơn chưa ai nhận mà đã quá ngưỡng chờ. */
  unclaimedStale: number;
  totalOrders: number;
};

const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3_600_000;

function mean(values: number[]): number | null {
  const usable = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (usable.length === 0) return null;
  return Math.round((usable.reduce((s, v) => s + v, 0) / usable.length) * 10) / 10;
}

/** Mốc cuối cùng người phụ trách đơn có động tĩnh. */
function lastTouch(o: OrderRow): string {
  return [o.cancelled_at, o.completed_at, o.confirmed_at, o.delivered_at, o.held_at, o.claimed_at]
    .filter((v): v is string => !!v)
    .reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a), o.created_at);
}

export async function listAgentPerformance(days = 30): Promise<AgentDeskReport> {
  const client = createAdminSupabaseClient();
  const empty: AgentDeskReport = { days, agents: [], unclaimed: 0, unclaimedStale: 0, totalOrders: 0 };
  if (!client) return empty;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = (await untypedFrom(client, "shop_orders")
    .select(
      "id,agent_id,status,amount,fee,created_at,claimed_at,held_at,delivered_at,confirmed_at,completed_at,cancelled_at",
    )
    .gte("created_at", since)
    .limit(2000)) as { data: OrderRow[] | null; error: { message: string } | null };

  if (error) {
    console.error(`[shop] listAgentPerformance lỗi: ${error.message}`);
    return empty;
  }
  const orders = data ?? [];
  if (orders.length === 0) return empty;

  // Đơn từng có khiếu nại — kể cả khiếu nại đã xử lý xong. Chỉ đếm status
  // "disputed" thì mọi vụ đã giải quyết sẽ biến mất khỏi bảng công, đúng thứ
  // cần nhìn nhất lại là thứ bị giấu đi.
  const { data: disputeRows } = (await untypedFrom(client, "shop_disputes")
    .select("order_id")
    .limit(2000)) as { data: { order_id: string }[] | null };
  const disputed = new Set((disputeRows ?? []).map((d) => d.order_id));

  const buckets = new Map<string, OrderRow[]>();
  let unclaimed = 0;
  let unclaimedStale = 0;

  for (const o of orders) {
    if (!o.agent_id) {
      // Đơn đã huỷ mà chưa ai nhận không phải là hàng chờ đang kẹt.
      if (ACTIVE_ORDER_STATUSES.includes(o.status)) {
        unclaimed++;
        if (isOrderStale(o)) unclaimedStale++;
      }
      continue;
    }
    const list = buckets.get(o.agent_id);
    if (list) list.push(o);
    else buckets.set(o.agent_id, [o]);
  }

  const names = await agentNames([...buckets.keys()]);

  const agents: AgentStat[] = [...buckets.entries()]
    .map(([agentId, rows]) => {
      const who = names.get(agentId);
      const active = rows.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
      const done = rows.filter((o) => o.status === "completed");
      return {
        agentId,
        name: who?.name ?? agentId.slice(0, 8),
        role: who?.role ?? "?",
        active: active.length,
        stale: active.filter(isOrderStale).length,
        claimed: rows.length,
        completed: done.length,
        cancelled: rows.filter((o) => o.status === "cancelled").length,
        disputed: rows.filter((o) => disputed.has(o.id)).length,
        gmv: done.reduce((s, o) => s + o.amount, 0),
        fee: done.reduce((s, o) => s + o.fee, 0),
        avgClaimHours: mean(
          rows.filter((o) => o.claimed_at).map((o) => hoursBetween(o.created_at, o.claimed_at!)),
        ),
        avgCompleteHours: mean(
          done.filter((o) => o.claimed_at && o.completed_at)
            .map((o) => hoursBetween(o.claimed_at!, o.completed_at!)),
        ),
        lastActiveAt: rows
          .map(lastTouch)
          .reduce<string | null>((a, b) => (!a || Date.parse(b) > Date.parse(a) ? b : a), null),
      };
    })
    // Ai đang ôm nhiều đơn treo nhất lên đầu — đó là người cần nói chuyện trước.
    .sort((a, b) => b.stale - a.stale || b.active - a.active || b.completed - a.completed);

  return { days, agents, unclaimed, unclaimedStale, totalOrders: orders.length };
}

async function agentNames(ids: string[]): Promise<Map<string, { name: string; role: string }>> {
  const client = createAdminSupabaseClient();
  if (!client || ids.length === 0) return new Map();
  const { data } = (await untypedFrom(client, "users")
    .select("id, display_name, role")
    .in("id", ids)) as { data: { id: string; display_name: string | null; role: string | null }[] | null };
  return new Map(
    (data ?? []).map((u) => [u.id, { name: u.display_name ?? "(không tên)", role: u.role ?? "?" }]),
  );
}
