import { NextRequest, NextResponse } from "next/server";
import { runBxhRankNotify } from "@/lib/server/bxh-rank-notify";

// Cron 08:00 VN. Nhịp 20:00 VN chạy ké trong /api/cron/checkin-reminder vì plan
// Hobby chỉ cho mỗi cron chạy 1 lần/ngày.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBxhRankNotify();
  if (!result.ok) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  return NextResponse.json(result);
}
