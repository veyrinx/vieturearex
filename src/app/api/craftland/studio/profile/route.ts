import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCreatorByUserId, tbl, cleanText } from "@/lib/server/craftland";
import { fail, linkListSchema, imageUrlSchema, readJson, requireMember, usernameSchema } from "@/lib/server/craftland-api";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(1000).default(""),
  avatar_url: imageUrlSchema.nullable().default(null),
  cover_url: imageUrlSchema.nullable().default(null),
  social_links: linkListSchema,
});

export async function GET(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio", limit: 60 });
  if (denied) return denied;
  const creator = await getCreatorByUserId(actor.userId);
  return NextResponse.json({ creator });
}

/** Tạo mới hoặc cập nhật hồ sơ creator của chính người đăng nhập. */
export async function PUT(request: NextRequest) {
  const { actor, denied } = await requireMember(request, { name: "craftland-studio-write", limit: 20 });
  if (denied) return denied;
  const body = await readJson(request, schema);
  if ("error" in body) return body.error;

  const existing = await getCreatorByUserId(actor.userId);
  if (existing?.status === "suspended") return fail(403, "Hồ sơ creator đang bị khoá.");

  const payload = {
    user_id: actor.userId,
    username: body.data.username,
    display_name: cleanText(body.data.display_name),
    bio: cleanText(body.data.bio),
    avatar_url: body.data.avatar_url,
    cover_url: body.data.cover_url,
    social_links: body.data.social_links,
  };

  // Đổi tên hiển thị sau khi đã được xác minh → huy hiệu không còn khớp hồ sơ
  // đã duyệt. Không tự thu hồi, nhưng chặn đổi để tránh mạo danh.
  if (existing?.verification_status === "verified" && existing.display_name !== payload.display_name) {
    return fail(409, "Creator đã xác minh không tự đổi tên hiển thị được. Liên hệ đội ngũ để cập nhật.");
  }
  if (existing?.verification_status === "verified" && existing.username !== payload.username) {
    return fail(409, "Creator đã xác minh không tự đổi username được.");
  }

  const { data, error } = (await tbl("craftland_creators")
    .upsert(payload as never, { onConflict: "user_id" })
    .select("*")
    .single()) as unknown as { data: unknown; error: { code?: string; message: string } | null };

  if (error?.code === "23505") return fail(409, "Username này đã có người dùng.");
  if (error) return fail(400, "Không lưu được hồ sơ. Kiểm tra lại thông tin.");
  return NextResponse.json({ creator: data });
}
