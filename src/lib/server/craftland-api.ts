import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCraftlandActor, isSafeUrl, type CraftlandActor } from "@/lib/server/craftland";
import { supabaseUrl } from "@/lib/supabase/env";
import type { CapabilityKey } from "@/lib/permissions";

/**
 * Chốt chung cho API Craftland. Mọi route trả lỗi theo cùng một dạng
 * `{ error: string }` để client hiển thị toast thẳng.
 */

export const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

type Guarded = { actor: CraftlandActor; denied?: never } | { actor?: never; denied: NextResponse };

/** Đã đăng nhập (member trở lên). Tài khoản bị khoá đã bị getAuthContext hạ xuống. */
export async function requireMember(request: NextRequest, rate: { name: string; limit: number }): Promise<Guarded> {
  const limited = enforceRateLimit(request, { name: rate.name, limit: rate.limit, windowMs: 60_000 });
  if (limited) return { denied: limited };
  const actor = await getCraftlandActor();
  if (!actor) return { denied: fail(401, "Bạn cần đăng nhập để thực hiện thao tác này.") };
  return { actor };
}

/**
 * Quản trị viên có capability. Dùng lại enforceAdminApiAuth để cùng một nguồn
 * quyền với phần còn lại của /admin (chặn tài khoản bị khoá, vai tự tạo...).
 */
export async function requireStaff(request: NextRequest, capability: CapabilityKey, rateLimit = 60): Promise<Guarded> {
  const limited = enforceRateLimit(request, { name: `craftland-admin:${capability}`, limit: rateLimit, windowMs: 60_000 });
  if (limited) return { denied: limited };
  const denied = await enforceAdminApiAuth({ minimumRole: "support", capability });
  if (denied) return { denied };
  const actor = await getCraftlandActor();
  if (!actor) return { denied: fail(401, "Unauthorized") };
  return { actor };
}

/**
 * Thao tác nhạy cảm (gỡ bản đồ, thu hồi xác minh, khoá creator...) đòi phiên
 * AAL2 nếu tài khoản đã bật MFA. Người chưa bật MFA vẫn làm được nhưng UI luôn
 * bắt nhập lý do + xác nhận lại; nên bật MFA cho mọi tài khoản quản trị.
 */
export async function requireMfaIfEnrolled(): Promise<NextResponse | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      return fail(403, "Thao tác này cần xác thực MFA. Hãy đăng nhập lại và nhập mã xác thực.", { code: "mfa_required" });
    }
  } catch {
    // Không đọc được AAL → không chặn; lý do + xác nhận vẫn bắt buộc ở schema.
  }
  return null;
}

export async function readJson<T>(request: NextRequest, schema: z.ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail(400, "Dữ liệu gửi lên không hợp lệ.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return { error: fail(400, `${where}${first?.message ?? "Dữ liệu không hợp lệ."}`) };
  }
  return { data: parsed.data };
}

// ── Schema dùng chung ─────────────────────────────────────────

export const urlSchema = z.string().trim().max(500).refine(isSafeUrl, "Liên kết phải bắt đầu bằng http(s)://");

/**
 * Ảnh chỉ nhận từ kho lưu trữ của chính site (Supabase Storage, tải lên qua
 * /api/upload) hoặc CDN ImageKit đang dùng — không nhúng ảnh từ host lạ vào
 * trang công khai (pixel theo dõi, ảnh đổi nội dung sau khi duyệt...).
 */
const IMAGE_HOSTS = new Set(
  [supabaseUrl ? new URL(supabaseUrl).host : null, "ik.imagekit.io"].filter((h): h is string => !!h),
);
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && IMAGE_HOSTS.has(u.host);
    } catch {
      return false;
    }
  }, "Ảnh phải được tải lên qua ArexNetwork.");

export const linkListSchema = z
  .array(z.object({ label: z.string().trim().min(1).max(40), url: urlSchema }))
  .max(8)
  .default([]);

export const reasonSchema = z.string().trim().min(5, "Hãy ghi lý do (ít nhất 5 ký tự).").max(1000);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Username gồm 3–24 ký tự a-z, 0-9 hoặc _.");

export const mapInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().max(280).default(""),
  description: z.string().trim().max(20000).default(""),
  category_slug: z.string().trim().regex(/^[a-z0-9-]{2,32}$/),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(30).regex(/^[\p{L}\p{N} _-]+$/u, "Tag chỉ gồm chữ, số, khoảng trắng, - và _."))
    .max(10)
    .default([]),
  map_code: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9#_-]*$/, "Mã map chỉ gồm chữ, số và # _ -")
    .transform((v) => v || null)
    .nullable()
    .default(null),
  platforms: z.array(z.enum(["mobile", "pc"])).max(2).default([]),
  cover_url: imageUrlSchema.nullable().default(null),
  gallery: z.array(imageUrlSchema).max(12).default([]),
  video_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be|tiktok\.com|facebook\.com|fb\.watch)\//i.test(v), "Chỉ hỗ trợ video YouTube, TikTok hoặc Facebook.")
    .transform((v) => v || null)
    .nullable()
    .default(null),
  how_to_play: z.string().trim().max(5000).default(""),
});
export type MapInput = z.infer<typeof mapInputSchema>;
