import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getFeatureLocks } from "@/lib/server/feature-locks";

// Công khai (chỉ đọc) — dùng cho banner admin phía client biết trang nào đang khóa.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "feature-locks", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const locks = await getFeatureLocks();
  return NextResponse.json({ locks });
}
