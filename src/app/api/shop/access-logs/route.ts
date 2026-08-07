import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { isShopAdminRole } from "@/lib/server/shop";
import { shopJson } from "@/lib/server/shop-privacy";

/**
 * Ai đã mở giấy tờ người bán / thông tin bàn giao acc, lúc nào, từ IP nào.
 *
 * Bảng chỉ ghi thêm (không có policy UPDATE/DELETE), nên đây là chỗ đối chiếu
 * khi có ai đó kêu bị lộ thông tin.
 */
export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  kind: string;
  target: string;
  ip: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-access-logs", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) {
    return shopJson({ error: "Không có quyền." }, { status: 403 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ logs: [] });

  const { data } = (await untypedFrom(db, "shop_access_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)) as { data: LogRow[] | null };

  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v))];

  // Gắn tên người xem để admin khỏi phải tra id thủ công.
  let names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: users } = (await untypedFrom(db, "users")
      .select("id, display_name, email")
      .in("id", ids)) as { data: Array<{ id: string; display_name: string | null; email: string }> | null };
    names = new Map((users ?? []).map((u) => [u.id, u.display_name || u.email]));
  }

  return shopJson(
    { logs: rows.map((r) => ({ ...r, actor_name: r.actor_id ? names.get(r.actor_id) ?? null : null })) }
  );
}
