import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import {
  appendLoginToLarkSheet,
  appendOrderToLarkSheet,
  appendTeamJoinToLarkSheet,
  appendTournamentRequestToLarkSheet,
  appendUserToLarkSheet,
} from "@/lib/server/lark-sheet";

/**
 * Ghi thử 1 dòng vào từng tab để admin kiểm tra cấu hình Lark.
 * Cũng là cách dựng sẵn cả 5 tab kèm tiêu đề trong bảng tính trống.
 */
export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const results = await Promise.all([
    appendUserToLarkSheet({
      email: "test@arexnetwork.site",
      display_name: "[THỬ] Test Account",
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "user",
      source: "Ghi thử từ trang cấu hình",
      ff_id: "12345678",
      ip: "0.0.0.0",
      device: "Windows PC",
      browser: "Chrome",
    }),
    appendLoginToLarkSheet({
      email: "test@arexnetwork.site",
      display_name: "[THỬ] Test Account",
      user_id: "00000000-0000-0000-0000-000000000000",
      method: "Ghi thử",
      ip: "0.0.0.0",
      device: "Windows PC",
      browser: "Chrome",
    }),
    appendOrderToLarkSheet({
      event: "Ghi thử",
      code: "TEST-0000",
      status: "pending_agent",
      listing_title: "[THỬ] Tin đăng mẫu",
      amount: 100000,
      fee: 5000,
      payout_amount: 95000,
      buyer_name: "[THỬ] Người mua",
    }),
    appendTournamentRequestToLarkSheet({
      name: "[THỬ] Giải đấu mẫu",
      format: "squad",
      max_teams: 8,
      contact_name: "[THỬ] Người liên hệ",
      contact_email: "test@arexnetwork.site",
    }),
    appendTeamJoinToLarkSheet({
      email: "test@arexnetwork.site",
      display_name: "[THỬ] Ứng viên mẫu",
      applied_role: "Ghi thử",
      invite_label: "Ghi thử",
    }),
  ]);

  const failed = results.find((r) => !r.ok);
  if (!failed) return NextResponse.json({ ok: true, sheets: results.length });

  return NextResponse.json(
    { ok: false, reason: failed.reason ?? "unknown" },
    { status: 400 },
  );
}
