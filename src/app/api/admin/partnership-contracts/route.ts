import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { parsePartyA, SETTINGS_KEY_PARTY_A } from "@/lib/constants/partnership-contract";
import {
  expireOverdueContracts,
  getPartyA,
  listContracts,
  savePartyA,
} from "@/lib/server/partnership-contracts";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-contracts", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  // Dọn dẹp ngay lúc mở bảng: hợp đồng đã ký mà quá hạn thì chuyển 'expired'.
  await expireOverdueContracts();

  const [items, partyA] = await Promise.all([listContracts(), getPartyA()]);
  return NextResponse.json({ items, partyA });
}

/** Cập nhật thông tin pháp lý của Bên A (Arex) dùng cho mọi hợp đồng ký sau. */
export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-contracts", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.partyA !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parsePartyA(JSON.stringify(body.partyA));
  if (!cleaned.repName) {
    return NextResponse.json(
      { error: "Phải có tên người đại diện Bên A — hợp đồng thiếu chỗ này là vô hiệu." },
      { status: 400 },
    );
  }

  try {
    await savePartyA(cleaned);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_PARTY_A,
    summary: `Cập nhật thông tin Bên A trong hợp đồng hợp tác (${cleaned.repName})`,
  }).catch(() => {});

  return NextResponse.json({ partyA: cleaned });
}
