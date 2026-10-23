import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanText } from "@/lib/server/craftland";
import { fail, imageUrlSchema, readJson, reasonSchema, requireMfaIfEnrolled, requireStaff, urlSchema } from "@/lib/server/craftland-api";
import { editMapAsStaff, MAP_ACTIONS, moderateMap, type MapAction } from "@/lib/server/craftland-moderation";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(Object.keys(MAP_ACTIONS) as [MapAction, ...MapAction[]]),
  reason: z.string().trim().max(1000).optional(),
  featured_rank: z.number().int().min(0).max(999).optional(),
});

const editSchema = z.object({
  action: z.literal("edit"),
  reason: reasonSchema,
  fields: z.object({
    title: z.string().trim().min(3).max(120).optional(),
    summary: z.string().trim().max(280).optional(),
    description: z.string().trim().max(20000).optional(),
    category_slug: z.string().trim().regex(/^[a-z0-9-]{2,32}$/).optional(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).optional(),
    map_code: z.string().trim().max(64).regex(/^[A-Za-z0-9#_-]*$/).transform((v) => v || null).nullable().optional(),
    how_to_play: z.string().trim().max(5000).optional(),
    cover_url: imageUrlSchema.nullable().optional(),
    video_url: urlSchema.nullable().optional(),
  }),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireStaff(request, "craftland.moderate");
  if (denied) return denied;
  const { id } = await params;

  const body = await readJson(request, z.union([editSchema, actionSchema]));
  if ("error" in body) return body.error;

  if (body.data.action === "edit") {
    const { fields, reason } = body.data as z.infer<typeof editSchema>;
    const clean = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, typeof v === "string" && !["category_slug", "map_code", "cover_url", "video_url"].includes(k) ? cleanText(v) : v]),
    );
    const result = await editMapAsStaff({ actor, mapId: id, fields: clean, reason, request });
    return result.ok ? NextResponse.json({ map: result.map }) : fail(result.status, result.error);
  }

  const { action, reason, featured_rank } = body.data as z.infer<typeof actionSchema>;
  if (MAP_ACTIONS[action].sensitive) {
    const mfa = await requireMfaIfEnrolled();
    if (mfa) return mfa;
  }
  const result = await moderateMap({ actor, mapId: id, action, reason, featuredRank: featured_rank, request });
  return result.ok ? NextResponse.json({ map: result.map }) : fail(result.status, result.error);
}
