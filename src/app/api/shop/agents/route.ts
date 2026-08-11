import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { isShopAdminRole } from "@/lib/server/shop";
import { listAgentPerformance } from "@/lib/server/shop-stats";
import { shopJson } from "@/lib/server/shop-privacy";

/**
 * Bảng công của giao dịch viên — chỉ admin chợ đọc được.
 *
 * Không mở cho chính giao dịch viên: đây là số liệu để đánh giá con người,
 * xem được của nhau thì nó thành bảng xếp hạng nội bộ chứ không còn là công cụ
 * quản lý.
 */
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-agents", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!isShopAdminRole(auth.role)) return shopJson({ error: "Không có quyền." }, { status: 403 });

  const raw = Number(new URL(req.url).searchParams.get("days"));
  const days = [7, 30, 90].includes(raw) ? raw : 30;

  return shopJson(await listAgentPerformance(days));
}
