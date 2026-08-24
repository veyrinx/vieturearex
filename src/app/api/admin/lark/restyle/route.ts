import { NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { restyleLarkSheets } from "@/lib/server/lark-sheet";

/**
 * Áp lại định dạng cho các tab đã có sẵn trong Lark Spreadsheet.
 *
 * Tab mới được tạo dáng ngay lúc sinh ra; route này dành cho bảng dựng từ
 * trước đợt nâng cấp. Không ghi thêm dòng dữ liệu nào.
 */
export async function POST() {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const result = await restyleLarkSheets();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
