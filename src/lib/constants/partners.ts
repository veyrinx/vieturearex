// Đối tác / hợp tác — dữ liệu lưu trong settings key `site.partners` (JSON).
// Quản lý ở /admin/partners, hiển thị ở /partnership. Hàm thuần (client + server).

import { SOCIAL_DEFS, type SocialKey } from "@/lib/constants/social-links";

export const SETTINGS_KEY_PARTNERS = "site.partners";

export const PARTNER_TIERS = ["sponsor", "media", "community"] as const;
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export const TIER_LABEL: Record<PartnerTier, string> = {
  sponsor: "Nhà tài trợ",
  media: "Đối tác truyền thông",
  community: "Cộng đồng đồng hành",
};

/** Link mạng xã hội của đối tác — dùng chung bộ định nghĩa với hồ sơ người dùng. */
export type PartnerSocials = Partial<Record<SocialKey, string>>;

export type Partner = {
  id: string;
  name: string;
  tier: PartnerTier;
  /** Mô tả ngắn về đối tác. */
  desc?: string;
  /** Logo bên trái tên (URL ảnh — tải lên hoặc dán link). */
  logo?: string;
  /** Logo bên phải tên, để dựng cặp "Arex × đối tác". */
  logoRight?: string;
  /** Link website/fanpage đối tác. */
  url?: string;
  /** Các trang mạng xã hội của đối tác. */
  socials?: PartnerSocials;
  /** Ngày hết hợp tác (YYYY-MM-DD). Quá ngày này thì tự ẩn khỏi trang công khai. */
  endsAt?: string;
  featured?: boolean;
  enabled?: boolean;
};

const isTier = (v: unknown): v is PartnerTier =>
  typeof v === "string" && (PARTNER_TIERS as readonly string[]).includes(v);

const httpUrl = (v: unknown, max = 400) =>
  typeof v === "string" && /^https?:\/\//i.test(v) ? v.slice(0, max) : undefined;

const isoDate = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;

const SOCIAL_KEYS = SOCIAL_DEFS.map((s) => s.key);

function parseSocials(v: unknown): PartnerSocials | undefined {
  if (!v || typeof v !== "object") return undefined;
  const src = v as Record<string, unknown>;
  const out: PartnerSocials = {};
  for (const key of SOCIAL_KEYS) {
    const url = httpUrl(src[key]);
    if (url) out[key] = url;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Còn hiển thị công khai hay không: phải bật, và chưa quá ngày hết hợp tác.
 * Ngày hết tính hết ngày đó (so sánh theo chuỗi YYYY-MM-DD giờ VN).
 */
export function isPartnerLive(p: Partner, today = todayInVietnam()): boolean {
  if (p.enabled === false) return false;
  if (p.endsAt && p.endsAt < today) return false;
  return true;
}

export function todayInVietnam(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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
      logoRight: httpUrl(o.logoRight),
      url: httpUrl(o.url),
      socials: parseSocials(o.socials),
      endsAt: isoDate(o.endsAt),
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
      ...(i.logoRight ? { logoRight: i.logoRight } : {}),
      ...(i.url ? { url: i.url } : {}),
      ...(i.socials && Object.keys(i.socials).length > 0 ? { socials: i.socials } : {}),
      ...(i.endsAt ? { endsAt: i.endsAt } : {}),
      ...(i.featured ? { featured: true } : {}),
      ...(i.enabled === false ? { enabled: false } : {}),
    })),
  );
}

export const DEFAULT_PARTNERS: Partner[] = [];
