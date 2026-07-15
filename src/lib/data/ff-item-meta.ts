import "server-only";
import metaJson from "../../../public/ff-item-meta.json";
import descJson from "./ff-item-desc.json";

// Dữ liệu chuẩn cộng đồng: id → [chỉ số loại, tên, chỉ số độ hiếm].
type MetaFile = { types: string[]; rarities: string[]; items: Record<string, [number, string, number]> };
const data = metaJson as unknown as MetaFile;
const descriptions = descJson as unknown as Record<string, string>;

export type ItemMeta = { type: string | null; name: string | null; rarity: string | null; description: string | null };

const EMPTY: ItemMeta = { type: null, name: null, rarity: null, description: null };

export function getItemMetaById(id: string): ItemMeta {
  const e = data.items[id];
  const description = descriptions[id] ?? null;
  if (!e) return { ...EMPTY, description };
  return {
    type: data.types[e[0]] ?? null,
    name: e[1] || null,
    rarity: data.rarities[e[2]] ?? null,
    description,
  };
}
