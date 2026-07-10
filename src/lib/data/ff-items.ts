import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const BUCKET = "ff-items";

export type FFItem = {
  id: string;
  label: string | null;
  category: string | null;
  imageUrl: string;
};

// ID icon chỉ gồm chữ/số/-/_ (chống path traversal & abuse)
export function isValidItemId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  weapon:    { label: "Súng / Vũ khí",  color: "text-red-500",     bg: "bg-red-500/10" },
  character: { label: "Nhân vật",        color: "text-blue-500",    bg: "bg-blue-500/10" },
  pet:       { label: "Pet",             color: "text-pink-500",    bg: "bg-pink-500/10" },
  outfit:    { label: "Trang phục",      color: "text-purple-500",  bg: "bg-purple-500/10" },
  skin:      { label: "Skin",            color: "text-amber-500",   bg: "bg-amber-500/10" },
  accessory: { label: "Phụ kiện",        color: "text-emerald-500", bg: "bg-emerald-500/10" },
  emote:     { label: "Emote",           color: "text-violet-500",  bg: "bg-violet-500/10" },
  vehicle:   { label: "Xe",              color: "text-cyan-500",    bg: "bg-cyan-500/10" },
  other:     { label: "Khác",            color: "text-muted-foreground", bg: "bg-muted" },
};

/** Lấy chi tiết 1 item. Trả null nếu id không hợp lệ hoặc ảnh không tồn tại. */
export async function getItemDetail(id: string): Promise<FFItem | null> {
  if (!isValidItemId(id)) return null;
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const imageUrl = db.storage.from(BUCKET).getPublicUrl(`${id}.png`).data.publicUrl;

  const { data } = (await untypedFrom(db, "ff_items_catalog")
    .select("id, label, category, is_public")
    .eq("id", id)
    .maybeSingle()) as {
    data: { id: string; label: string | null; category: string | null; is_public: boolean } | null;
  };

  const inCatalog = !!data && data.is_public;

  // Nếu chưa có trong catalog thì xác nhận ảnh tồn tại trong bucket
  let exists = inCatalog;
  if (!exists) {
    try {
      const res = await fetch(imageUrl, { method: "HEAD", cache: "no-store" });
      exists = res.ok;
    } catch {
      exists = false;
    }
  }
  if (!exists) return null;

  return { id, label: data?.label ?? null, category: data?.category ?? null, imageUrl };
}

/** Item liên quan: cùng loại (nếu có catalog) hoặc cùng tiền tố 3 số. */
export async function getRelatedItems(item: FFItem, limit = 18): Promise<FFItem[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  const base = untypedFrom(db, "ff_items_catalog")
    .select("id, label, category")
    .eq("is_public", true)
    .neq("id", item.id)
    .limit(limit);

  const query = item.category
    ? base.eq("category", item.category)
    : base.like("id", `${item.id.slice(0, 3)}%`);

  const { data } = (await query) as {
    data: Array<{ id: string; label: string | null; category: string | null }> | null;
  };

  return (data ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    category: r.category,
    imageUrl: db.storage.from(BUCKET).getPublicUrl(`${r.id}.png`).data.publicUrl,
  }));
}
