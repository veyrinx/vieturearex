import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";

type Comment = {
  id: string;
  news_id: string;
  user_id: string | null;
  display_name: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function GET(request: NextRequest) {
  const guard = await enforceAdminApiAuth({ minimumRole: "support" });
  if (guard) return guard;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ comments: [] });

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const query = admin
    .from("news_comments")
    .select("id, news_id, user_id, display_name, content, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data, error } = status === "all"
    ? await query as { data: Comment[] | null; error: unknown }
    : await query.eq("status", status) as { data: Comment[] | null; error: unknown };

  if (error) return NextResponse.json({ comments: [] });
  return NextResponse.json({ comments: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!body?.id || !body?.status || !["approved", "rejected", "pending"].includes(body.status)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const { error } = await (admin.from("news_comments") as ReturnType<typeof admin.from>)
    .update({ status: body.status } as never)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });

  const label = body.status === "approved" ? "APPROVED" : body.status === "rejected" ? "REJECTED" : "PENDING";
  await logAdminActivity({
    action: `COMMENT_${label}`,
    targetType: "NEWS",
    targetId: body.id,
    summary: `Bình luận ${body.id} → ${body.status}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Thiếu ID." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const { error } = await admin.from("news_comments").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Không thể xóa." }, { status: 500 });

  await logAdminActivity({
    action: "COMMENT_DELETED",
    targetType: "NEWS",
    targetId: body.id,
    summary: `Đã xóa bình luận ${body.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
