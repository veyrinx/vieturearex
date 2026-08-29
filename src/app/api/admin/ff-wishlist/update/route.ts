import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { WISHLIST_CAPACITY } from "@/lib/constants/ff-wishlist";
import {
  decorateItems,
  fetchWishlist,
  openSession,
  updateWishlist,
} from "@/lib/server/ff-wishlist";

/**
 * Thêm / bớt món trong wishlist của acc đang đăng nhập.
 *
 * Gateway nhận một món mỗi lượt nên phần lặp nằm ở máy chủ; client bấm một lần
 * là xong. Đọc lại danh sách ngay sau khi sửa để màn hình luôn khớp với game
 * chứ không đoán theo kết quả bấm.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store, no-cache, must-revalidate, private" } as const;

const idList = z.array(z.string().regex(/^\d{1,12}$/)).max(WISHLIST_CAPACITY);

const schema = z
  .object({
    session: z.string().min(10),
    add: idList.optional(),
    remove: idList.optional(),
  })
  .refine((v) => (v.add?.length ?? 0) + (v.remove?.length ?? 0) > 0, {
    message: "Chưa chọn món nào.",
  });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wishlist-update", limit: 40, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ capability: "wishlist.manage" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400, headers: NO_STORE },
    );
  }

  const session = await openSession(parsed.data.session);
  if (!session) {
    return NextResponse.json({ error: "Phiên đã hết hạn, đăng nhập lại acc." }, { status: 401, headers: NO_STORE });
  }

  const add = parsed.data.add ?? [];
  const remove = parsed.data.remove ?? [];

  if (add.length > 0) {
    // Wishlist trong game chỉ chứa 100 món — chặn từ đây cho khỏi gọi thừa một
    // loạt lượt rồi mới biết đầy.
    const before = await fetchWishlist(session);
    if (!("error" in before)) {
      const room = WISHLIST_CAPACITY - before.ids.filter((id) => !remove.includes(id)).length;
      if (add.length > room) {
        return NextResponse.json(
          { error: `Wishlist chỉ còn chỗ cho ${Math.max(0, room)} món.` },
          { status: 409, headers: NO_STORE },
        );
      }
    }
  }

  const result = await updateWishlist(session, { add, remove });

  await logAdminActivity({
    action: "WISHLIST_UPDATED",
    targetType: "FF_ACCOUNT",
    targetId: session.uid,
    summary: `Acc ${session.uid}: +${result.added.length} / -${result.removed.length} món wishlist`,
    request,
  });

  const after = await fetchWishlist(session);
  return NextResponse.json(
    {
      ...result,
      items: "error" in after ? [] : await decorateItems(after.ids),
      corrupted: "error" in after ? false : after.corrupted,
    },
    { headers: NO_STORE },
  );
}
