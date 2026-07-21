// Cửa hàng Prime — dữ liệu lưu trong settings key `store.prime` (JSON).
// Quản lý ở /admin/prime, hiển thị ở /cua-hang-prime. Hàm thuần (client + server).

export const SETTINGS_KEY_PRIME = "store.prime";

export type PrimeItemType = "membership" | "pack";

export type PrimeItem = {
  id: string;
  name: string;
  type: PrimeItemType;
  /** Giá kim cương. */
  price: number;
  /** Mô tả thời hạn/phụ đề, vd "30 ngày". */
  duration?: string;
  /** Ảnh vật phẩm (skin/nhân vật) hiển thị trong banner. */
  image?: string;
  /** Quyền lợi (chỉ dùng cho membership). */
  perks?: string[];
  featured?: boolean;
  enabled?: boolean;
};

const clampInt = (n: unknown, max = 10_000_000) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
};

export function parsePrimeItems(raw: string | null | undefined): PrimeItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: PrimeItem[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 80) : "";
    if (!name) continue;
    const type: PrimeItemType = o.type === "pack" ? "pack" : "membership";
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : Math.random().toString(36).slice(2),
      name,
      type,
      price: clampInt(o.price),
      duration: typeof o.duration === "string" ? o.duration.slice(0, 60) : undefined,
      image: typeof o.image === "string" && /^https?:\/\//i.test(o.image) ? o.image.slice(0, 400) : undefined,
      perks: Array.isArray(o.perks)
        ? o.perks.filter((p): p is string => typeof p === "string").map((p) => p.slice(0, 120)).slice(0, 12)
        : undefined,
      featured: o.featured === true,
      enabled: o.enabled !== false,
    });
    if (out.length >= 60) break;
  }
  return out;
}

export function serializePrimeItems(items: PrimeItem[]): string {
  return JSON.stringify(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      price: clampInt(i.price),
      ...(i.duration ? { duration: i.duration } : {}),
      ...(i.image ? { image: i.image } : {}),
      ...(i.perks && i.perks.length ? { perks: i.perks } : {}),
      ...(i.featured ? { featured: true } : {}),
      ...(i.enabled === false ? { enabled: false } : {}),
    })),
  );
}

export const DEFAULT_PRIME_ITEMS: PrimeItem[] = [
  { id: "prime", name: "Prime", type: "membership", price: 599, duration: "/ tháng", enabled: true,
    perks: ["+10% kim cương mỗi lần nạp", "Khung avatar Prime", "Huy hiệu Prime trong hồ sơ"] },
  { id: "prime-plus", name: "Prime Plus", type: "membership", price: 999, duration: "/ tháng", featured: true, enabled: true,
    perks: ["Toàn bộ quyền lợi Prime", "+25% kim cương mỗi lần nạp", "Quà hằng ngày độc quyền", "Ưu tiên hỗ trợ CSKH"] },
  { id: "pack-week", name: "Gói Tuần", type: "pack", price: 149, duration: "7 ngày Prime", enabled: true },
  { id: "pack-month", name: "Gói Tháng", type: "pack", price: 499, duration: "30 ngày Prime", enabled: true },
  { id: "pack-quarter", name: "Gói Quý", type: "pack", price: 1290, duration: "90 ngày Prime", enabled: true },
  { id: "pack-year", name: "Gói Năm", type: "pack", price: 3990, duration: "365 ngày Prime", enabled: true },
];
