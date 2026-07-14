import "server-only";
import metaJson from "../../../public/ff-item-meta.json";

// Dữ liệu chuẩn cộng đồng: id → [chỉ số loại, tên, chỉ số độ hiếm].
type MetaFile = { types: string[]; rarities: string[]; items: Record<string, [number, string, number]> };
const data = metaJson as unknown as MetaFile;

export type ItemMeta = { type: string | null; name: string | null; rarity: string | null };

const EMPTY: ItemMeta = { type: null, name: null, rarity: null };

export function getItemMetaById(id: string): ItemMeta {
  const e = data.items[id];
  if (!e) return EMPTY;
  return {
    type: data.types[e[0]] ?? null,
    name: e[1] || null,
    rarity: data.rarities[e[2]] ?? null,
  };
}
