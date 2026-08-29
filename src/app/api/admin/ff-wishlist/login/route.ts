import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { WISHLIST_DAT_MAX_BYTES, WISHLIST_METHODS } from "@/lib/constants/ff-wishlist";
import {
  decorateItems,
  fetchWishlist,
  loginWishlistAccount,
  sealSession,
} from "@/lib/server/ff-wishlist";

/**
 * Đăng nhập acc người chơi để gắn wishlist hộ.
 *
 * Bản rõ (.dat hoặc uid + mật khẩu) đi qua đây đúng một lần rồi biến mất: gửi
 * sang gateway, lấy token phiên, KHÔNG ghi xuống DB, không log ra đâu cả. Thứ
 * quay về trình duyệt chỉ là chuỗi phiên đã niêm phong.
 *
 * Quyền riêng `wishlist.credentials` — vai chỉ có `wishlist.view` mở được công
 * cụ nhưng không đăng nhập được acc nào.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store, no-cache, must-revalidate, private" } as const;

const schema = z
  .object({
    method: z.enum(WISHLIST_METHODS),
    dat_name: z.string().max(120).optional(),
    dat_b64: z.string().max(Math.ceil((WISHLIST_DAT_MAX_BYTES * 4) / 3) + 64).optional(),
    uid: z.string().trim().max(64).optional(),
    password: z.string().max(128).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === "dat" && !v.dat_b64) ctx.addIssue({ code: "custom", message: "Chưa chọn tệp .dat." });
    if (v.method === "guest" && (!v.uid || !v.password)) {
      ctx.addIssue({ code: "custom", message: "Thiếu UID khách hoặc mật khẩu." });
    }
  });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-wishlist-login", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ capability: "wishlist.credentials" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400, headers: NO_STORE },
    );
  }
  const body = parsed.data;

  let datBytes: Uint8Array | undefined;
  if (body.method === "dat") {
    try {
      datBytes = Uint8Array.from(Buffer.from(body.dat_b64!, "base64"));
    } catch {
      return NextResponse.json({ error: "Tệp .dat không đọc được." }, { status: 400, headers: NO_STORE });
    }
    if (!datBytes.length || datBytes.length > WISHLIST_DAT_MAX_BYTES) {
      return NextResponse.json({ error: "Tệp .dat rỗng hoặc quá lớn." }, { status: 400, headers: NO_STORE });
    }
  }

  const result = await loginWishlistAccount({
    method: body.method,
    datName: body.dat_name,
    datBytes,
    uid: body.uid,
    password: body.password,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
  }

  const sealed = await sealSession(result.session);
  if (!sealed) {
    return NextResponse.json(
      { error: "Không niêm phong được phiên — kiểm tra SHOP_SECRET_KEY / APP_SECRET." },
      { status: 500, headers: NO_STORE },
    );
  }

  // Ai đã mở acc nào, lúc nào — để còn truy khi có chuyện.
  await logAdminActivity({
    action: "WISHLIST_ACCOUNT_LOGIN",
    targetType: "FF_ACCOUNT",
    targetId: result.session.uid,
    summary: `Đăng nhập acc ${result.session.uid} để gắn wishlist (${body.method})`,
    request,
  });

  const list = await fetchWishlist(result.session);
  const items = "error" in list ? [] : await decorateItems(list.ids);

  return NextResponse.json(
    {
      session: sealed,
      uid: result.session.uid,
      region: result.session.region,
      expires_at: new Date(result.session.expiresAt).toISOString(),
      items,
      corrupted: "error" in list ? false : list.corrupted,
      warning: "error" in list ? list.error : null,
    },
    { headers: NO_STORE },
  );
}
