import { NextRequest } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getUsers, getNews, getEvents } from "@/lib/data/content-service";

const ROLE_VI: Record<string, string> = {
  it: "IT", super_admin: "Super Admin", admin: "Admin",
  manager: "Quản lý", support: "CSKH", user: "Người dùng",
};

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  // BOM ﻿ để Excel đọc đúng UTF-8 (tiếng Việt)
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "");

// GET ?type=registrations|news|events — xuất báo cáo ra CSV
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "report-export", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "manager" });
  if (denied) return denied;

  const type = new URL(req.url).searchParams.get("type") ?? "registrations";
  let header: string[];
  let rows: unknown[][];
  let name: string;

  if (type === "news") {
    const news = await getNews("all");
    news.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    header = ["STT", "Tiêu đề", "Chuyên mục", "Trạng thái", "Người tạo", "Ngày tạo"];
    rows = news.map((n, i) => [i + 1, n.title, n.category, n.status, n.created_by_name ?? "", fmt(n.created_at)]);
    name = "bao-cao-tin-tuc";
  } else if (type === "events") {
    const events = await getEvents();
    events.sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    header = ["STT", "Tên sự kiện", "Bắt đầu", "Kết thúc", "Trạng thái", "Lượt xem", "Người tạo"];
    rows = events.map((e, i) => [i + 1, e.title, fmt(e.start_date), fmt(e.end_date), e.status, e.view_count ?? 0, e.created_by_name ?? ""]);
    name = "bao-cao-su-kien";
  } else {
    const users = await getUsers();
    users.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    header = ["STT", "Tên hiển thị", "Email", "Vai trò", "Đã xác minh", "Bị khóa", "Ngày đăng ký", "Lượt xem"];
    rows = users.map((u, i) => [
      i + 1,
      u.display_name ?? u.email?.split("@")[0] ?? "",
      u.email ?? "",
      ROLE_VI[u.role] ?? u.role,
      u.is_verified ? "Có" : "Không",
      u.is_banned ? "Có" : "Không",
      fmt(u.created_at),
      u.views ?? 0,
    ]);
    name = "bao-cao-dang-ky";
  }

  const csv = toCsv(header, rows);
  const filename = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
