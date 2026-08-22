import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getClientIp } from "@/lib/server/get-client-ip";
import { verifyLicense } from "@/lib/server/licenses";
import { LICENSE_DENY_REASON_LABEL } from "@/lib/constants/license";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cổng xác thực giấy phép cho sản phẩm chạy ở phía đối tác.
 *
 *   POST /api/license/verify
 *   { "key": "AREX-…", "domain": "doi-tac.vn", "instance_id": "…",
 *     "product": "website", "app_version": "1.4.2" }
 *
 * `instance_id` là chuỗi ổn định do máy khách tự sinh và lưu lại (uuid ghi vào
 * file cấu hình / localStorage). Nhờ nó mới đếm được một mã đang chạy ở mấy
 * chỗ; thiếu nó thì vẫn xác thực được, chỉ là không đếm.
 *
 * Không có xác thực người dùng ở đây — chính cái mã là thứ chứng minh. Chống
 * quét mò bằng rate limit + ký tự kiểm tra trong mã.
 */
const bodySchema = z.object({
  key: z.string().min(1).max(64),
  domain: z.string().max(253).optional(),
  instance_id: z.string().min(1).max(120).optional(),
  product: z.string().max(40).optional(),
  app_version: z.string().max(40).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "license-verify", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, reason: "malformed", message: LICENSE_DENY_REASON_LABEL.malformed },
      { status: 400, headers: CORS },
    );
  }

  // Tên miền lấy từ body nếu máy khách khai; không khai thì suy từ Origin —
  // trình duyệt không cho giả header này nên nó đáng tin hơn body.
  const originHost = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  const domain = parsed.data.domain || originHost || undefined;

  const result = await verifyLicense({
    key: parsed.data.key,
    domain,
    instanceId: parsed.data.instance_id,
    product: parsed.data.product,
    appVersion: parsed.data.app_version,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (!result.valid) {
    return NextResponse.json(
      {
        ...result,
        message: LICENSE_DENY_REASON_LABEL[result.reason] ?? "Giấy phép không hợp lệ",
      },
      // 200 chứ không phải 4xx: đây là câu trả lời hợp lệ cho một câu hỏi hợp
      // lệ. Máy khách nào cũng đọc được `valid`, khỏi phải bắt lỗi HTTP.
      { status: 200, headers: CORS },
    );
  }

  return NextResponse.json(result, { headers: CORS });
}
