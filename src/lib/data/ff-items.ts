import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getAllIconIds, iconUrl, isValidIconId } from "@/lib/data/ff-icons";

export type FFItem = {
  id: string;
  label: string | null;
  category: string | null;
  imageUrl: string;
};

// ID icon chỉ gồm chữ/số/-/_ (chống path traversal & abuse)
export function isValidItemId(id: string): boolean {
  return isValidIconId(id);
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

// Nhãn/loại (nếu có) từ catalog nội bộ — không bắt buộc
async function catalogMeta(id: string): Promise<{ label: string | null; category: string | null }> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return { label: null, category: null };
    const { data } = (await untypedFrom(db, "ff_items_catalog")
      .select("label, category, is_public")
      .eq("id", id)
      .maybeSingle()) as { data: { label: string | null; category: string | null; is_public: boolean } | null };
    if (data && data.is_public) return { label: data.label, category: data.category };
  } catch { /**/ }
  return { label: null, category: null };
}

/** Chi tiết 1 icon. Trả null nếu id không hợp lệ hoặc không có trong kho. */
export async function getItemDetail(id: string): Promise<FFItem | null> {
  if (!isValidIconId(id)) return null;
  const ids = await getAllIconIds();
  // Nếu lấy được list mà id không có -> không tồn tại. List rỗng (GitHub lỗi) thì bỏ qua kiểm tra.
  if (ids.length > 0 && !ids.includes(id)) return null;

  const { label, category } = await catalogMeta(id);
  return { id, label, category, imageUrl: iconUrl(id) };
}

/** Icon liên quan: cùng tiền tố 3 ký tự trong kho. */
export async function getRelatedItems(item: FFItem, limit = 18): Promise<FFItem[]> {
  const ids = await getAllIconIds();
  const prefix = item.id.slice(0, 3);
  return ids
    .filter((x) => x !== item.id && x.startsWith(prefix))
    .slice(0, limit)
    .map((id) => ({ id, label: null, category: null, imageUrl: iconUrl(id) }));
}
