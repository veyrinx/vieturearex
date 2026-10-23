import "server-only";
import raw from "@/lib/data/craftland-api-index.json";

/**
 * Chỉ mục tài liệu Craftland chính thức (Garena), sinh bởi
 * `node scripts/sync-craftland-docs.mjs`. Chỉ chứa tên, chữ ký và kiểu tham
 * số; mô tả đầy đủ luôn link về trang gốc.
 */

export type DocParam = { name: string; type: string };
export type DocItem = {
  title: string;
  slug: string;
  obsolete: boolean;
  signature?: string | null;
  input?: DocParam[];
  output?: DocParam[];
};
export type DocGroup = { title: string; items: DocItem[]; key: string };
export type DocSectionKey = "api" | "event" | "type";
export type DocSection = { key: DocSectionKey; title: string; groups: DocGroup[] };

type RawIndex = {
  source: string;
  syncedAt: string;
  sections: Record<string, { title: string; groups: Array<{ title: string; items: DocItem[] }> }>;
};

const index = raw as unknown as RawIndex;

export const DOCS_SOURCE = index.source;
export const DOCS_SYNCED_AT = index.syncedAt;
export const officialDocUrl = (slug: string) => `${index.source}${slug}`;

function groupKey(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "nhom"
  );
}

const SECTION_ORDER: DocSectionKey[] = ["api", "event", "type"];

export const DOC_SECTIONS: DocSection[] = SECTION_ORDER.filter((k) => index.sections[k]).map((key) => {
  const used = new Set<string>();
  return {
    key,
    title: index.sections[key].title,
    groups: index.sections[key].groups.map((g) => {
      let k = groupKey(g.title);
      for (let i = 2; used.has(k); i++) k = `${groupKey(g.title)}-${i}`;
      used.add(k);
      return { ...g, key: k };
    }),
  };
});

export function getDocGroup(section: string, key: string): { section: DocSection; group: DocGroup } | null {
  const s = DOC_SECTIONS.find((x) => x.key === section);
  const g = s?.groups.find((x) => x.key === key);
  return s && g ? { section: s, group: g } : null;
}

/** Tìm theo tên tiếng Việt hoặc tên hàm trong chữ ký (VD "LogInfo"). */
export function searchDocs(q: string, limit = 80) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const out: Array<{ section: DocSection; group: DocGroup; item: DocItem }> = [];
  for (const section of DOC_SECTIONS) {
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.title.toLowerCase().includes(term) || item.signature?.toLowerCase().includes(term)) {
          out.push({ section, group, item });
          if (out.length >= limit) return out;
        }
      }
    }
  }
  return out;
}
