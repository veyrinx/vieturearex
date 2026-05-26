import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createNotification } from "@/lib/server/notifications";

type Comment = {
  id: string;
  news_id?: string;
  event_id?: string;
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
  const table = request.nextUrl.searchParams.get("table") === "event_comments"
    ? "event_comments"
    : "news_comments";

  const selectFields = table === "event_comments"
    ? "id, event_id, user_id, display_name, content, status, created_at"
    : "id, news_id, user_id, display_name, content, status, created_at";

  const query = (admin.from(table) as ReturnType<typeof admin.from>)
    .select(selectFields)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data, error } = status === "all"
    ? await query as { data: Comment[] | null; error: unknown }
    : await (query as ReturnType<typeof query.eq>).eq("status", status) as { data: Comment[] | null; error: unknown };

  if (error) return NextResponse.json({ comments: [] });
  return NextResponse.json({ comments: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const raw = await request.json().catch(() => null) as {
    id?: string;
    ids?: string[];
    status?: string;
    table?: string;
  } | null;

  if (!raw?.status || !["approved", "rejected", "pending"].includes(raw.status)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const table = raw.table === "event_comments" ? "event_comments" : "news_comments";

  // Bulk update — accepts either `ids[]` (bulk) or `id` (single)
  const ids = raw.ids?.length ? raw.ids : raw.id ? [raw.id] : [];
  if (ids.length === 0) return NextResponse.json({ error: "Thiếu ID." }, { status: 400 });

  const { data: updated, error } = await (admin.from(table) as ReturnType<typeof admin.from>)
    .update({ status: raw.status } as never)
    .in("id", ids)
    .select("id, user_id, display_name, content, news_id, event_id") as {
      data: Array<{ id: string; user_id: string | null; display_name: string; content: string; news_id?: string; event_id?: string }> | null;
      error: unknown;
    };

  if (error) return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });

  const label = raw.status === "approved" ? "APPROVED" : raw.status === "rejected" ? "REJECTED" : "PENDING";
  await logAdminActivity({
    action: `COMMENT_${label}`,
    targetType: "NEWS",
    targetId: ids[0],
    summary: `${ids.length} bình luận → ${raw.status}`,
  }).catch(() => {});

  // In-app notification for approved user comments
  if (raw.status === "approved" && updated?.length) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";
    void Promise.allSettled(
      updated
        .filter((c) => c.user_id)
        .map((c) => {
          const entityUrl = c.news_id
            ? `${siteUrl}/news/${c.news_id}`
            : c.event_id
            ? `${siteUrl}/events/${c.event_id}`
            : null;
          return createNotification({
            user_id: c.user_id!,
            type: "comment_approved",
            title: "Bình luận của bạn đã được duyệt",
            body: c.content.slice(0, 120),
            entity_type: c.news_id ? "news" : "event",
            entity_id: c.news_id ?? c.event_id ?? undefined,
            entity_url: entityUrl ?? undefined,
          });
        })
    );
  }

  // Revalidate public pages so approved comments appear immediately
  if (raw.status === "approved" && updated?.length) {
    const newsIds = [...new Set(updated.map((c) => c.news_id).filter(Boolean))];
    const eventIds = [...new Set(updated.map((c) => c.event_id).filter(Boolean))];
    newsIds.forEach((id) => revalidatePath(`/news/${id}`, "page"));
    eventIds.forEach((id) => revalidatePath(`/events/${id}`, "page"));
  }

  return NextResponse.json({ ok: true, updated: updated?.length ?? ids.length });
}

export async function DELETE(request: NextRequest) {
  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const body = await request.json().catch(() => null) as { id?: string; table?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Thiếu ID." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const table = body.table === "event_comments" ? "event_comments" : "news_comments";
  const { error } = await (admin.from(table) as ReturnType<typeof admin.from>).delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Không thể xóa." }, { status: 500 });

  await logAdminActivity({
    action: "COMMENT_DELETED",
    targetType: "NEWS",
    targetId: body.id,
    summary: `Đã xóa bình luận ${body.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
