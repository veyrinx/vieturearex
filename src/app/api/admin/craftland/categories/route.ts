import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText, logCraftlandAction, tbl } from "@/lib/server/craftland";
import { fail, readJson, requireStaff } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{2,32}$/, "Slug gồm 2–32 ký tự a-z, 0-9, -"),
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(300).default(""),
  sort_order: z.number().int().min(0).max(9999).default(100),
  is_active: z.boolean().default(true),
});

/** Tạo mới hoặc cập nhật thể loại (theo slug). Không xoá — tắt is_active. */
export async function PUT(request: NextRequest) {
  const { actor, denied } = await requireStaff(request, "craftland.content", 30);
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;

  const row = { ...body.data, name: cleanText(body.data.name), description: cleanText(body.data.description) };
  const { error } = (await tbl("craftland_categories").upsert(row as never, { onConflict: "slug" })) as unknown as { error: unknown };
  if (error) return fail(500, "Không lưu được thể loại.");

  await logCraftlandAction({
    actor, targetType: "category", targetId: row.slug, action: "category_upsert",
    metadata: row, summary: `Lưu thể loại Craftland "${row.name}"`, request,
  });
  return NextResponse.json({ ok: true });
}
