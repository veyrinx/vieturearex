import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { parseItemsJson, type ImportedItem } from "@/lib/constants/ff-items-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lấy kho vật phẩm mới nhất thẳng từ GitHub KingofGames02/Free-Fire-Items-Library.
 *
 * Kho này tự cập nhật mỗi lần game ra bản mới — `live` là server chính thức,
 * `advance` là server thử nghiệm (có OB sắp ra trước, vd OB56). Trình duyệt
 * không gọi thẳng được (CSP chặn raw.githubusercontent), nên máy chủ tải file
 * ~12MB, đọc bằng cùng bộ luật `parseItemsJson`, rồi trả về bản gọn
 * { id, label, category, ob } để trang admin nạp theo lô như file tải tay.
 */

const BASE = "https://raw.githubusercontent.com/KingofGames02/Free-Fire-Items-Library/main/Data";
const SOURCES = {
  live: `${BASE}/live/FF_ItemsData.json`,
  advance: `${BASE}/advance/FFAdv_ItemsData.json`,
} as const;

type SourceKey = keyof typeof SOURCES;

async function load(source: SourceKey): Promise<{ items: ImportedItem[]; skipped: number } | { error: string }> {
  try {
    const res = await fetch(SOURCES[source], { cache: "no-store", signal: AbortSignal.timeout(40_000) });
    if (!res.ok) return { error: `GitHub ${res.status} (${source})` };
    return parseItemsJson(await res.json());
  } catch (err) {
    return { error: `Không tải được ${source}: ${String(err).slice(0, 120)}` };
  }
}

// GET ?source=live,advance
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-remote", limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const wanted = (req.nextUrl.searchParams.get("source") ?? "live,advance")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SourceKey => s in SOURCES);
  if (wanted.length === 0) return NextResponse.json({ error: "source không hợp lệ" }, { status: 400 });

  const results = await Promise.all(wanted.map(load));

  // Gộp theo ID: bản sau (advance) bổ sung OB/nhãn/nhóm còn thiếu của bản trước.
  const byId = new Map<string, ImportedItem>();
  let skipped = 0;
  const errors: string[] = [];
  const perSource: Record<string, number> = {};
  results.forEach((r, i) => {
    if ("error" in r) {
      errors.push(r.error);
      return;
    }
    perSource[wanted[i]] = r.items.length;
    skipped += r.skipped;
    for (const it of r.items) {
      const prev = byId.get(it.id);
      byId.set(it.id, prev
        ? { id: it.id, label: prev.label ?? it.label, category: prev.category ?? it.category, ob: prev.ob ?? it.ob }
        : it);
    }
  });

  if (byId.size === 0) {
    return NextResponse.json({ error: errors.join("; ") || "Không đọc được vật phẩm nào." }, { status: 502 });
  }

  return NextResponse.json({ items: [...byId.values()], skipped, perSource, errors });
}
