import { NextRequest } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getUsers } from "@/lib/data/content-service";

const ROLE_VI: Record<string, string> = {
  it: "IT", super_admin: "Super Admin", admin: "Admin",
  manager: "Quản lý", support: "CSKH", user: "Người dùng",
};

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET — xuất báo cáo đăng ký (danh sách người dùng) ra CSV
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "report-export", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "manager" });
  if (denied) return denied;

  const users = await getUsers();
  users.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const header = ["STT", "Tên hiển thị", "Email", "Vai trò", "Đã xác minh", "Bị khóa", "Ngày đăng ký", "Lượt xem"];
  const rows = users.map((u, i) => [
    i + 1,
    u.display_name ?? u.email?.split("@")[0] ?? "",
    u.email ?? "",
    ROLE_VI[u.role] ?? u.role,
    u.is_verified ? "Có" : "Không",
    u.is_banned ? "Có" : "Không",
    u.created_at ? new Date(u.created_at).toLocaleString("vi-VN") : "",
    u.views ?? 0,
  ]);

  // BOM ﻿ để Excel đọc đúng UTF-8 (tiếng Việt)
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const filename = `bao-cao-dang-ky-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
