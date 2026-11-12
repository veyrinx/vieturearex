/**
 * Đọc file JSON kho vật phẩm Free Fire do người trực tải lên.
 *
 * Hàm thuần, dùng chung cho cả trình duyệt (đọc file, chia lô) lẫn máy chủ
 * (kiểm lại trước khi ghi) — một bộ luật, không lệch nhau.
 *
 * Nhận cả ba dạng file gặp ngoài đời:
 *   1. Mảng object   — `[{ "Id": 101000001, "Name": "Nulla", "Type": "AVATAR" }]`
 *      (đúng dạng Free-Fire-Items-Library, ~34k dòng)
 *   2. Mảng ID trần  — `["101000001", 101000002]`
 *   3. Object tra cứu — `{ "101000001": { "Name": "Nulla" } }`
 */

export const FF_ITEM_CATEGORIES = [
  "weapon", "character", "pet", "outfit", "skin",
  "accessory", "emote", "vehicle", "other",
] as const;

export type FfItemCategory = (typeof FF_ITEM_CATEGORIES)[number];

export type ImportedItem = {
  id: string;
  label: string | null;
  category: FfItemCategory | null;
  /** Phiên bản ra mắt, chuẩn hoá về dạng "OB55" (lấy từ `Tag` của kho gốc). */
  ob: string | null;
};

/** "ob55", "OB 55", 55 → "OB55". Giá trị khác (tag sự kiện…) → null. */
export const normalizeOb = (raw: unknown): string | null => {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw < 1000) return `OB${raw}`;
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^OB\s*(\d{1,3})$/i) ?? raw.trim().match(/^(\d{1,3})$/);
  return m ? `OB${parseInt(m[1], 10)}` : null;
};

/** Số của OB để sắp xếp — "OB55" → 55, không có → 0. */
export const obNumber = (ob: string | null | undefined): number => {
  const m = ob?.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

/**
 * `Type` trong kho vật phẩm → nhóm của site.
 *
 * Kho gốc chia theo cách của game (TREASUREBOX, DEBRIS, LOADOUTBOX…), không
 * khớp với chín nhóm mà trang /items đang lọc. Cái nào không có chỗ tương ứng
 * thì để `other` chứ không đoán bừa — đoán sai thì bộ lọc dẫn người xem tới
 * một danh sách sai, tệ hơn là không phân nhóm.
 */
const TYPE_TO_CATEGORY: Record<string, FfItemCategory> = {
  WEAPON: "weapon",
  GUN: "weapon",
  AVATAR: "character",
  CHARACTER: "character",
  PET: "pet",
  SPARKPET: "pet",
  CLOTHES: "outfit",
  // Trình duyệt gửi lại bản đã chuẩn hoá (category "outfit"…) — phải nhận lại đúng nhóm.
  OUTFIT: "outfit",
  OTHER: "other",
  BUNDLE: "outfit",
  OPTIONAL_BUNDLE: "outfit",
  COLLAB: "outfit",
  SKIN: "skin",
  ACCESSORY: "accessory",
  EMOTE: "emote",
  STICKER: "emote",
  VEHICLE: "vehicle",
};

export const mapItemCategory = (type: unknown): FfItemCategory | null => {
  if (typeof type !== "string") return null;
  return TYPE_TO_CATEGORY[type.trim().toUpperCase()] ?? "other";
};

/** ID vật phẩm cũng là tên file icon — chỉ nhận ký tự an toàn cho đường dẫn. */
export const isValidItemId = (id: string): boolean => /^[\w.-]{1,80}$/.test(id);

const pick = (o: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  }
  return undefined;
};

const ID_KEYS = ["Id", "id", "ID", "itemId", "ItemID", "item_id", "iconId"];
const NAME_KEYS = ["Name", "name", "label", "Label", "title", "Title", "displayName"];
const TYPE_KEYS = ["Type", "type", "category", "Category", "itemType"];
const OB_KEYS = ["Tag", "tag", "ob", "OB", "Ob", "version", "Version"];

/**
 * Kho gốc ghi `Name` là khoá dịch ("TXT_CHARACTER_EVA_NAME"), không phải tên
 * đọc được. Lưu nó làm nhãn thì trang /items hiện chữ máy — để null cho tên
 * chuẩn (ff-item-meta.json) hiện thay.
 */
const isLocKey = (s: string): boolean =>
  s.includes("_") && (/^[A-Za-z0-9_.-]+$/.test(s) || /^[A-Z0-9_ .-]+$/.test(s));

function fromRecord(raw: unknown, fallbackId?: string): ImportedItem | null {
  if (typeof raw === "string" || typeof raw === "number") {
    const id = String(raw).trim();
    return isValidItemId(id) ? { id, label: null, category: null, ob: null } : null;
  }
  if (!raw || typeof raw !== "object") return null;

  const o = raw as Record<string, unknown>;
  // Dòng kho gốc ẩn hoặc không có ảnh (Icon rỗng) — không có icon nào để tải.
  if (o.HideInIndex === true) return null;
  if ("Icon" in o && (typeof o.Icon !== "string" || !o.Icon.trim())) return null;

  const rawId = pick(o, ID_KEYS) ?? fallbackId;
  if (rawId === undefined) return null;

  const id = String(rawId).trim();
  if (!isValidItemId(id)) return null;

  const name = pick(o, NAME_KEYS);
  const label = typeof name === "string" && name.trim() && !isLocKey(name.trim())
    ? name.trim().slice(0, 80)
    : null;

  return {
    id,
    label,
    category: mapItemCategory(pick(o, TYPE_KEYS)),
    ob: normalizeOb(pick(o, OB_KEYS)),
  };
}

export type ParseResult = {
  items: ImportedItem[];
  /** Số dòng bị bỏ vì không rút được ID hợp lệ, hoặc dòng ẩn / không có icon. */
  skipped: number;
};

export function parseItemsJson(raw: unknown): ParseResult {
  const rows: Array<[unknown, string | undefined]> = Array.isArray(raw)
    ? raw.map((r) => [r, undefined] as [unknown, string | undefined])
    : raw && typeof raw === "object"
      ? Object.entries(raw as Record<string, unknown>).map(([k, v]) => [v, k] as [unknown, string | undefined])
      : [];

  const byId = new Map<string, ImportedItem>();
  let skipped = 0;

  for (const [row, key] of rows) {
    const item = fromRecord(row, key);
    if (!item) {
      skipped += 1;
      continue;
    }
    // File thật hay có ID lặp; bản sau có tên/nhóm thì thắng bản trống.
    const prev = byId.get(item.id);
    byId.set(item.id, {
      id: item.id,
      label: item.label ?? prev?.label ?? null,
      category: item.category ?? prev?.category ?? null,
      ob: item.ob ?? prev?.ob ?? null,
    });
  }

  return { items: [...byId.values()], skipped };
}
