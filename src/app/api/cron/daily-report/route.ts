import { NextRequest, NextResponse } from "next/server";
import { runDailyReport } from "@/lib/server/send-daily-report";
import { runAuthReport } from "@/lib/server/send-auth-report";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.headers.get("x-force-report") === "1";
  const result = await runDailyReport(force);

  if (!result.ok && result.error) {
    return NextResponse.json(result, { status: 500 });
  }

  // Báo cáo đăng nhập chạy ké ở đây để không tốn thêm cron slot. Chỉ gửi khi báo
  // cáo ngày đã gửi (cùng khung giờ, cùng kênh) và trong ngày có hoạt động.
  const authReport = result.sent || force
    ? await runAuthReport(force).catch((err) => ({ ok: false, sent: false, error: String(err) }))
    : { ok: true, sent: false, reason: "daily_report_skipped" };

  return NextResponse.json({ ...result, authReport });
}
