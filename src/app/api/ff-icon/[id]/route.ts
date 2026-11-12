import { NextRequest } from "next/server";
import { ICON_UPSTREAMS, storageIconUrl } from "@/lib/data/ff-icons";

/**
 * Proxy ảnh icon qua domain của site (cache vĩnh viễn ở CDN edge).
 *
 * Thứ tự nguồn — bản ĐÃ ĐỒNG BỘ trước, GitHub sau:
 *
 *  1. Supabase Storage (bucket `ff-items`), tức bản mà /admin/ff-items đã tải
 *     về. Trước đây route này đi thẳng ra GitHub trong MỌI trường hợp, nên hơn
 *     hai vạn ảnh đồng bộ nằm đó không ai đọc: tốn dung lượng, tốn công bấm,
 *     mà lời hứa "ổn định khi raw.githubusercontent bị chặn" thì không bao giờ
 *     được giữ.
 *  2. raw.githubusercontent — cho ảnh chưa kịp đồng bộ.
 *
 * Ảnh không đổi theo thời gian nên cache một năm; ảnh thiếu thì cache ngắn để
 * lần đồng bộ sau có hiệu lực ngay.
 */

const IMMUTABLE = "public, max-age=31536000, immutable";
/** Không tìm thấy thì nhớ ngắn thôi — đồng bộ xong là phải thấy liền. */
const MISS_CACHE = "public, max-age=300";
const TIMEOUT_MS = 8_000;

async function fetchPng(url: string, revalidate?: number): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = raw.replace(/\.png$/i, "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return new Response("Bad request", { status: 400 });
  }

  // 1. Bản đã đồng bộ trong Supabase Storage.
  const stored = storageIconUrl(id);
  if (stored) {
    const buf = await fetchPng(stored, 86_400);
    if (buf) {
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": IMMUTABLE,
          "x-arex-icon-source": "storage",
        },
      });
    }
  }

  // 2. Chưa đồng bộ → lấy tạm từ GitHub (KingofGames02 trước — có đồ mới ra sớm hơn).
  let buf: ArrayBuffer | null = null;
  for (const upstream of ICON_UPSTREAMS) {
    buf = await fetchPng(`${upstream}${id}.png`, 86_400);
    if (buf) break;
  }
  if (!buf) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": MISS_CACHE },
    });
  }

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": IMMUTABLE,
      "x-arex-icon-source": "upstream",
    },
  });
}
