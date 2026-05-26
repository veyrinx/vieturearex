import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { createNotification } from "@/lib/server/notifications";

const replySchema = z.object({
  rating_id: z.string().uuid(),
  content: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-reply", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = replySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const { data, error } = await untypedFrom(supabase, "rating_replies").insert({
    rating_id: parsed.data.rating_id,
    content: parsed.data.content,
  } as never).select("*").single() as { data: unknown; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the rating author if they have a user account
  const { data: rating } = await untypedFrom(supabase, "news_ratings")
    .select("user_id, title")
    .eq("id", parsed.data.rating_id)
    .maybeSingle() as { data: { user_id: string | null; title: string | null } | null };

  if (rating?.user_id) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    void createNotification({
      user_id: rating.user_id,
      type: "rating_reply",
      title: "Admin đã phản hồi đánh giá của bạn",
      body: parsed.data.content.slice(0, 120),
      entity_type: "news",
      entity_url: rating.title ? `${siteUrl}/news` : undefined,
    });
  }

  return NextResponse.json({ reply: data });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-reply", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { id } = await request.json().catch(() => ({})) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  await untypedFrom(supabase, "rating_replies").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
