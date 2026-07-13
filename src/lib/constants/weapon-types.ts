// Thể loại vũ khí Free Fire — dùng chung cho admin (form) và trang công khai (bộ lọc).
// value: lưu trong DB (ff_weapons.weapon_type); label: hiển thị tiếng Việt.
export const WEAPON_TYPES = [
  { value: "ar", label: "Súng trường (AR)" },
  { value: "smg", label: "Tiểu liên (SMG)" },
  { value: "sniper", label: "Bắn tỉa (Sniper)" },
  { value: "marksman", label: "Bán tự động (DMR)" },
  { value: "shotgun", label: "Shotgun" },
  { value: "lmg", label: "Trung liên (LMG)" },
  { value: "pistol", label: "Súng lục" },
  { value: "launcher", label: "Súng phóng" },
  { value: "melee", label: "Cận chiến" },
  { value: "throwable", label: "Vật ném / Bom keo" },
] as const;

export type WeaponType = (typeof WEAPON_TYPES)[number]["value"];

export const WEAPON_TYPE_VALUES = WEAPON_TYPES.map((t) => t.value) as WeaponType[];

const WEAPON_TYPE_LABELS = Object.fromEntries(
  WEAPON_TYPES.map((t) => [t.value, t.label]),
) as Record<string, string>;

export function weaponTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return WEAPON_TYPE_LABELS[value] ?? null;
}

// ── Phụ kiện gợi ý ──────────────────────────────────────────
export const ATTACHMENT_SLOTS = [
  { value: "muzzle", label: "Đầu nòng" },
  { value: "scope", label: "Ống ngắm" },
  { value: "magazine", label: "Băng đạn" },
  { value: "foregrip", label: "Ốp lót tay" },
  { value: "stock", label: "Báng súng" },
] as const;

export type AttachmentSlot = (typeof ATTACHMENT_SLOTS)[number]["value"];

export const ATTACHMENT_SLOT_VALUES = ATTACHMENT_SLOTS.map((s) => s.value) as AttachmentSlot[];

const ATTACHMENT_SLOT_LABELS = Object.fromEntries(
  ATTACHMENT_SLOTS.map((s) => [s.value, s.label]),
) as Record<string, string>;

export function attachmentSlotLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return ATTACHMENT_SLOT_LABELS[value] ?? null;
}

export type WeaponAttachment = { slot: string; name: string; note?: string | null };

// ── Lối chơi (combo/loadout) ────────────────────────────────
export const PLAYSTYLES = [
  { value: "rush", label: "Rush / Áp sát" },
  { value: "sniper", label: "Bắn tỉa" },
  { value: "support", label: "Hỗ trợ" },
  { value: "balanced", label: "Cân bằng" },
  { value: "defensive", label: "Phòng thủ" },
] as const;

export type Playstyle = (typeof PLAYSTYLES)[number]["value"];

export const PLAYSTYLE_VALUES = PLAYSTYLES.map((p) => p.value) as Playstyle[];

const PLAYSTYLE_LABELS = Object.fromEntries(
  PLAYSTYLES.map((p) => [p.value, p.label]),
) as Record<string, string>;

export function playstyleLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return PLAYSTYLE_LABELS[value] ?? null;
}
