import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { shopJson } from "@/lib/server/shop-privacy";
import { MAX_PRICE, MIN_PRICE } from "@/lib/constants/shop";

/**
 * Bộ lọc được theo dõi: lưu điều kiện tìm, có tin mới khớp thì được báo.
 *
 * Việc so khớp nằm ở `shop-notify.ts`, chạy đúng lúc tin được duyệt lên sàn.
 * Ở đây chỉ quản lý danh sách. Giới hạn 10 bộ/người do trigger trong DB giữ.
 */

export type WatchlistRow = {
  id: string;
  label: string;
  keyword: string | null;
  kind: "account" | "item" | null;
  min_price: number | null;
  max_price: number | null;
  notify: boolean;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-watchlist", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const { data } = (await untypedFrom(db, "shop_watchlists")
    .select("id, label, keyword, kind, min_price, max_price, notify, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })) as { data: WatchlistRow[] | null };

  return shopJson({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "shop-watchlist-add", limit: 20, windowMs: 600_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 60) : "";
  const kind = body.kind === "account" || body.kind === "item" ? body.kind : null;
  const minPrice = clampPrice(body.minPrice);
  const maxPrice = clampPrice(body.maxPrice);

  if (!keyword && !kind && minPrice == null && maxPrice == null) {
    return shopJson({ error: "Đặt ít nhất một điều kiện để theo dõi." }, { status: 400 });
  }
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return shopJson({ error: "Giá từ đang lớn hơn giá đến." }, { status: 400 });
  }

  const label =
    (typeof body.label === "string" && body.label.trim().slice(0, 60)) ||
    describeFilter({ keyword, kind, minPrice, maxPrice });

  const { data, error } = (await untypedFrom(db, "shop_watchlists")
    .insert({
      user_id: auth.userId,
      label,
      keyword: keyword || null,
      kind,
      min_price: minPrice,
      max_price: maxPrice,
    } as never)
    .select("id, label, keyword, kind, min_price, max_price, notify, created_at")
    .maybeSingle()) as { data: WatchlistRow | null; error: { message: string } | null };

  if (error) {
    // Trigger chặn quá 10 bộ ném lỗi có chữ tiếng Việt sẵn.
    const tooMany = error.message.includes("Tối đa");
    return shopJson(
      { error: tooMany ? "Bạn đã theo dõi 10 bộ lọc — xoá bớt rồi thêm lại." : error.message },
      { status: tooMany ? 409 : 500 },
    );
  }

  return shopJson({ ok: true, item: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.userId) return shopJson({ error: "Chưa đăng nhập." }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return shopJson({ error: "DB unavailable" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return shopJson({ error: "Thiếu id." }, { status: 400 });

  await untypedFrom(db, "shop_watchlists").delete().eq("id", id).eq("user_id", auth.userId);
  return shopJson({ ok: true });
}

function clampPrice(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, Math.round(n)));
}

function describeFilter(f: {
  keyword: string;
  kind: string | null;
  minPrice: number | null;
  maxPrice: number | null;
}): string {
  const parts: string[] = [];
  if (f.keyword) parts.push(`"${f.keyword}"`);
  if (f.kind) parts.push(f.kind === "account" ? "tài khoản" : "vật phẩm");
  if (f.minPrice != null && f.maxPrice != null) {
    parts.push(`${(f.minPrice / 1000).toFixed(0)}k–${(f.maxPrice / 1000).toFixed(0)}k`);
  } else if (f.minPrice != null) parts.push(`từ ${(f.minPrice / 1000).toFixed(0)}k`);
  else if (f.maxPrice != null) parts.push(`dưới ${(f.maxPrice / 1000).toFixed(0)}k`);
  return parts.join(" · ") || "Bộ lọc";
}
