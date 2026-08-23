import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { lookupScam, SUBJECT_LABEL } from "@/lib/server/scam-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/check-scam?q=0912345678
 *
 * Tra một định danh bất kỳ (SĐT, STK, UID game, Zalo/FB, họ tên) trong hồ sơ
 * rủi ro sinh từ tranh chấp chợ Arex đã xử.
 *
 * Giới hạn chặt hơn các API tra cứu khác: danh sách này là dữ liệu về người
 * thật, không để ai cào sạch rồi đem đi bêu chỗ khác.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "check-scam", limit: 12, windowMs: 60_000 });
  if (limited) return limited;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ error: "Nhập ít nhất 3 ký tự." }, { status: 400 });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "Nội dung tra cứu quá dài." }, { status: 400 });
  }

  const result = await lookupScam(q);

  return NextResponse.json({
    query: result.query,
    clean: result.hits.length === 0,
    worst: result.worst,
    triedTypes: result.triedTypes.map((t) => ({ type: t, label: SUBJECT_LABEL[t] })),
    hits: result.hits.map((h) => ({
      type: h.subject_type,
      typeLabel: SUBJECT_LABEL[h.subject_type],
      severity: h.severity,
      note: h.note,
      source: h.source,
      created_at: h.created_at,
    })),
  });
}
