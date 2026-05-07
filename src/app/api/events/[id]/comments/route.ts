import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { checkContent } from "@/lib/server/content-filter";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  parent_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: eventId } = await params;
  const supabase = createAdminSupabaseClient() ?? createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ comments: [] });

  const { data, error } = await (supabase.from("event_comments") as ReturnType<typeof supabase.from>)
    .select("id, user_id, display_name, content, status, created_at, parent_id, users(avatar_url)")
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200) as { data: Array<{ id: string; user_id: string | null; display_name: string; content: string; status: string; created_at: string; parent_id: string | null; users: { avatar_url: string | null } | null }> | null; error: { code?: string } | null };

  if (error) return NextResponse.json({ comments: [] });
  const comments = (data ?? []).map(({ users, ...c }) => ({ ...c, avatar_url: users?.avatar_url ?? null }));
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(request, { name: "event-comment", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const { id: eventId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Hệ thống bình luận tạm thời không khả dụng." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình luận." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Nội dung không hợp lệ." }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle() as { data: { display_name: string | null } | null };

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Người dùng";

  const verdict = checkContent(parsed.data.content);
  if (verdict === "rejected") {
    return NextResponse.json({ error: "Bình luận chứa nội dung vi phạm. Vui lòng chỉnh sửa lại." }, { status: 422 });
  }

  const { error } = await (supabase.from("event_comments") as ReturnType<typeof supabase.from>).insert({
    event_id: eventId,
    user_id: user.id,
    display_name: displayName,
    content: parsed.data.content,
    status: verdict,
    parent_id: parsed.data.parent_id ?? null,
  } as never);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "PGRST204") {
      return NextResponse.json({ error: "Hệ thống bình luận đang được thiết lập. Vui lòng thử lại sau." }, { status: 503 });
    }
    return NextResponse.json({ error: "Không thể gửi bình luận. Vui lòng thử lại." }, { status: 500 });
  }

  await logAdminActivity({
    action: "USER_COMMENTED",
    targetType: "EVENT",
    targetId: eventId,
    summary: `${displayName} (${user.email}) bình luận sự kiện ${eventId}`,
  }).catch(() => {});

  if (verdict === "pending") {
    return NextResponse.json({ ok: true, pending: true, message: "Bình luận của bạn đang chờ kiểm duyệt." });
  }
  return NextResponse.json({ ok: true });
}
