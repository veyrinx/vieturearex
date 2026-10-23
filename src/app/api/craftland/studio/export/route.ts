import { NextRequest } from "next/server";
import { getDailyRows, tbl } from "@/lib/server/craftland";
import { requireMember } from "@/lib/server/craftland-api";
import { parseRange } from "@/lib/server/craftland-stats";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const s = String(value);
  // Chặn CSV injection: ô bắt đầu bằng = + - @ bị Excel hiểu là công thức.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Xuất CSV số liệu theo ngày cho các bản đồ của chính creator. */
export async function GET(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-export", limit: 10 });
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const range = parseRange({ range: sp.get("range") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });

  const { data: maps } = (await tbl("craftland_maps").select("id, slug, title").eq("creator_id", actor.userId).limit(500)) as unknown as {
    data: Array<{ id: string; slug: string; title: string }> | null;
  };
  const byId = new Map((maps ?? []).map((m) => [m.id, m]));
  const rows = await getDailyRows(Array.from(byId.keys()), range.from, range.to);

  const header = ["ngay", "ban_do", "slug", "luot_xem_web", "khach_uoc_tinh", "sao_chep_ma", "mo_huong_dan", "chia_se", "luot_luu_moi"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const m = byId.get(r.map_id);
    if (!m) continue;
    lines.push([r.day, m.title, m.slug, r.views, r.unique_visitors, r.copies, r.guide_opens, r.shares, r.favorites].map(csvCell).join(","));
  }

  // BOM để Excel đọc đúng tiếng Việt
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="craftland-${range.from}_${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
