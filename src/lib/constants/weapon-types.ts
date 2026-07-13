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
