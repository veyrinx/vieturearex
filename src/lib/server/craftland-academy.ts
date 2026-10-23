import "server-only";
import { z } from "zod";
import { sanitizeRichText } from "@/lib/server/sanitize";
import { linkListSchema } from "@/lib/server/craftland-api";
import { tbl } from "@/lib/server/craftland";
import type { CraftlandAcademyArticle, CraftlandAcademyCategory } from "@/lib/types/craftland";

export const academyArticleSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,100}$/, "Slug gồm a-z, 0-9, -")
    // /academy/api là trang tra cứu API — bài trùng slug sẽ không bao giờ mở được.
    .refine((v) => v !== "api", "Slug \"api\" đã dành cho trang tra cứu API.")
    .or(z.literal(""))
    .default(""),
  category_slug: z.string().trim().regex(/^[a-z0-9-]{2,48}$/),
  excerpt: z.string().trim().max(300).default(""),
  body: z.string().max(200000),
  platform: z.enum(["pc", "mobile", "both"]).default("both"),
  sources: linkListSchema,
  compat_warning: z.string().trim().max(500).nullable().default(null),
  sort_order: z.number().int().min(0).max(9999).default(100),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** HTML đã sanitize để lưu + bản text thuần để tìm kiếm. */
export function prepareAcademyBody(raw: string): { html: string; text: string } {
  const html = sanitizeRichText(raw);
  const text = decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return { html, text };
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Gắn id cho h2/h3 và dựng mục lục. Id ổn định theo nội dung tiêu đề. */
export function withToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag: string, attrs: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    const base =
      text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "muc";
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
    used.add(id);
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    const cleanAttrs = attrs.replace(/\sid="[^"]*"/i, "");
    return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}

export async function getAcademyCategories(): Promise<CraftlandAcademyCategory[]> {
  try {
    const { data } = (await tbl("craftland_academy_categories").select("*").order("sort_order")) as unknown as {
      data: CraftlandAcademyCategory[] | null;
    };
    return data ?? [];
  } catch {
    return [];
  }
}

export type AcademyListItem = Pick<
  CraftlandAcademyArticle,
  "id" | "slug" | "category_slug" | "title" | "excerpt" | "platform" | "sort_order" | "published_at" | "updated_at"
>;

const LIST_COLUMNS = "id, slug, category_slug, title, excerpt, platform, sort_order, published_at, updated_at";

export async function listPublishedArticles(q?: string): Promise<AcademyListItem[]> {
  try {
    let query = tbl("craftland_academy_articles").select(LIST_COLUMNS).eq("status", "published");
    const term = (q ?? "").replace(/[,()*%\\"{}]/g, " ").trim().slice(0, 60);
    if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%,body_text.ilike.%${term}%`);
    const { data } = (await query.order("sort_order").order("published_at", { ascending: true }).limit(500)) as unknown as {
      data: AcademyListItem[] | null;
    };
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPublishedArticle(slug: string): Promise<CraftlandAcademyArticle | null> {
  const { data } = (await tbl("craftland_academy_articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle()) as unknown as {
    data: CraftlandAcademyArticle | null;
  };
  return data;
}
