import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { decorateItems, fetchWishlist, openSession } from "@/lib/server/ff-wishlist";

/** Đọc lại wishlist của acc đang đăng nhập (hoặc của một UID khác để đối chiếu). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store, no-cache, must-revalidate, private" } as const;

const schema = z.object({
  session: z.string().min(10),
  account_id: z.string().trim().regex(/^\d{4,15}$/).optional(),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wishlist-list", limit: 90, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ capability: "wishlist.view" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400, headers: NO_STORE });
  }

  const session = await openSession(parsed.data.session);
  if (!session) {
    return NextResponse.json({ error: "Phiên đã hết hạn, đăng nhập lại acc." }, { status: 401, headers: NO_STORE });
  }

  const list = await fetchWishlist(session, parsed.data.account_id);
  if ("error" in list) {
    return NextResponse.json({ error: list.error }, { status: list.status, headers: NO_STORE });
  }

  return NextResponse.json(
    { items: await decorateItems(list.ids), corrupted: list.corrupted },
    { headers: NO_STORE },
  );
}
