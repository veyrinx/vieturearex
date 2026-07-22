// Đối tác / hợp tác — dữ liệu lưu trong settings key `site.partners` (JSON).
// Quản lý ở /admin/hop-tac, hiển thị ở /hop-tac. Hàm thuần (client + server).

export const SETTINGS_KEY_PARTNERS = "site.partners";

export const PARTNER_TIERS = ["sponsor", "media", "community"] as const;
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export const TIER_LABEL: Record<PartnerTier, string> = {
  sponsor: "Nhà tài trợ",
  media: "Đối tác truyền thông",
  community: "Cộng đồng đồng hành",
};

export type Partner = {
  id: string;
  name: string;
  tier: PartnerTier;
  /** Mô tả ngắn về đối tác. */
  desc?: string;
  /** Logo (URL ảnh). */
  logo?: string;
  /** Link website/fanpage đối tác. */
  url?: string;
  featured?: boolean;
  enabled?: boolean;
};

const isTier = (v: unknown): v is PartnerTier =>
  typeof v === "string" && (PARTNER_TIERS as readonly string[]).includes(v);

const httpUrl = (v: unknown, max = 400) =>
  typeof v === "string" && /^https?:\/\//i.test(v) ? v.slice(0, max) : undefined;

export function parsePartners(raw: string | null | undefined): Partner[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Partner[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 80) : "";
    if (!name) continue;
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : Math.random().toString(36).slice(2),
      name,
      tier: isTier(o.tier) ? o.tier : "community",
      desc: typeof o.desc === "string" ? o.desc.trim().slice(0, 300) : undefined,
      logo: httpUrl(o.logo),
      url: httpUrl(o.url),
      featured: o.featured === true,
      enabled: o.enabled !== false,
    });
    if (out.length >= 60) break;
  }
  return out;
}

export function serializePartners(items: Partner[]): string {
  return JSON.stringify(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      tier: i.tier,
      ...(i.desc ? { desc: i.desc } : {}),
      ...(i.logo ? { logo: i.logo } : {}),
      ...(i.url ? { url: i.url } : {}),
      ...(i.featured ? { featured: true } : {}),
      ...(i.enabled === false ? { enabled: false } : {}),
    })),
  );
}

export const DEFAULT_PARTNERS: Partner[] = [];
