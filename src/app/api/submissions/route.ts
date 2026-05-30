import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

const schema = z.object({
  title:        z.string().min(10).max(200),
  excerpt:      z.string().min(30).max(500),
  content:      z.string().min(100).max(50_000),
  category:     z.string().min(1).max(80),
  cover_url:    z.string().url().optional().or(z.literal("")),
  author_name:  z.string().min(2).max(100),
  author_email: z.string().email(),
  notes:        z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "submissions", limit: 3, windowMs: 3_600_000 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Dịch vụ tạm thời không khả dụng." }, { status: 503 });

  const { cover_url, ...rest } = parsed.data;
  const { error } = await untypedFrom(db, "user_submissions").insert({
    ...rest,
    cover_url: cover_url || null,
  } as never);

  if (error) {
    console.error("[submissions] insert error:", error.message);
    return NextResponse.json({ error: "Không thể lưu bài viết, vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
