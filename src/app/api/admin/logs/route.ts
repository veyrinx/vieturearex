import { NextRequest, NextResponse } from "next/server";
import { getAdminActivityLogs } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  NON_ADMIN_LOG_ACTIONS,
  USER_LOG_ACTIONS,
  VISITOR_LOG_ACTIONS,
  isActivityLogType,
  type ActivityLogType,
} from "@/lib/constants/activity-log-types";

/**
 * Trần số dòng trả về. PostgREST vốn tự cắt ở 1.000; nói rõ ra để biết mình
 * đang cắt ở đâu, và để cắt SAU khi đã lọc theo loại chứ không phải trước.
 */
const LOG_LIMIT = 500;

type Client = NonNullable<ReturnType<typeof createAdminSupabaseClient>>;

/** Thu hẹp truy vấn theo loại việc — làm dưới CSDL, không kéo về rồi mới lọc. */
function applyType<T extends { in: unknown; not: unknown }>(query: T, type: ActivityLogType): T {
  const q = query as unknown as {
    in: (col: string, values: readonly string[]) => T;
    not: (col: string, op: string, value: string) => T;
  };
  if (type === "user") return q.in("action", USER_LOG_ACTIONS);
  if (type === "visitor") return q.in("action", VISITOR_LOG_ACTIONS);
  if (type === "admin") return q.not("action", "in", `(${NON_ADMIN_LOG_ACTIONS.join(",")})`);
  return query;
}

/** Đếm từng loại để nút lọc hiện đúng tổng, không phải tổng của trang đang xem. */
async function countByType(db: Client, from: string | null, to: string | null) {
  const one = async (type: ActivityLogType) => {
    let q = db.from("admin_activity_logs").select("*", { count: "exact", head: true });
    if (from) q = q.gte("created_at", new Date(from).toISOString()) as typeof q;
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      q = q.lte("created_at", toDate.toISOString()) as typeof q;
    }
    const { count } = await applyType(q as never, type);
    return count ?? 0;
  };
  const [all, admin, user, visitor] = await Promise.all([
    one("all"),
    one("admin"),
    one("user"),
    one("visitor"),
  ]);
  return { all, admin, user, visitor };
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-logs", limit: 80, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ capability: "logs.view" });
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const action = searchParams.get("action") ?? "";
  const typeParam = searchParams.get("type") ?? "all";
  const type: ActivityLogType = isActivityLogType(typeParam) ? typeParam : "all";

  const db = createAdminSupabaseClient();

  // Không có admin client (chế độ demo) thì rơi về đường cũ: lấy cả bảng rồi
  // để phía trình duyệt tự lọc.
  if (!db) {
    try {
      const logs = await getAdminActivityLogs();
      return NextResponse.json({ logs, counts: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load logs.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    let query = db
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(LOG_LIMIT);

    if (from) query = query.gte("created_at", new Date(from).toISOString()) as typeof query;
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("created_at", toDate.toISOString()) as typeof query;
    }
    if (action) query = query.ilike("action", `%${action}%`) as typeof query;
    query = applyType(query as never, type);

    const [{ data, error }, counts] = await Promise.all([query, countByType(db, from, to)]);
    if (error) throw error;

    return NextResponse.json({ logs: data ?? [], counts, limit: LOG_LIMIT });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
