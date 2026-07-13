import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import type { RatingInfo } from "@/lib/data/ff-data";

const postSchema = z.object({
  stars: z.number().int().min(1).max(5),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "ff-item-rating", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { id: itemId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Hệ thống đánh giá tạm thời không khả dụng." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để đánh giá." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Số sao không hợp lệ." }, { status: 400 });

  const { error } = await (supabase.from("item_ratings") as ReturnType<typeof supabase.from>)
    .upsert(
      { item_id: itemId, user_id: user.id, stars: parsed.data.stars, updated_at: new Date().toISOString() } as never,
      { onConflict: "item_id,user_id" },
    ) as { error: { code?: string } | null };

  if (error) {
    const code = (error as { code?: string })?.code;
    if (code === "42P01" || code === "PGRST204") {
      return NextResponse.json({ error: "Hệ thống đánh giá đang được thiết lập. Vui lòng thử lại sau." }, { status: 503 });
    }
    return NextResponse.json({ error: "Không thể gửi đánh giá. Vui lòng thử lại." }, { status: 500 });
  }

  const { data } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: { average_rating: number; rating_count: number; user_rating: number | null } | null }>)(
    "get_item_ratings",
    { p_item_id: itemId },
  );

  const ratings: RatingInfo = {
    average: Number(data?.average_rating ?? parsed.data.stars),
    count: Number(data?.rating_count ?? 1),
    user_rating: data?.user_rating ?? parsed.data.stars,
  };

  return NextResponse.json({ ok: true, ratings });
}
