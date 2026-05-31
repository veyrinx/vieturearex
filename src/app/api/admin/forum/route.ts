import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-forum", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await enforceAdminApiAuth({ minimumRole: "support" });
  if (guard) return guard;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ items: [] });

  const url = req.nextUrl;
  const type = url.searchParams.get("type") === "replies" ? "replies" : "posts";
  const status = url.searchParams.get("status") ?? "all";

  if (type === "posts") {
    let q = untypedFrom(db, "forum_posts")
      .select("id, title, category, user_id, display_name, view_count, reply_count, is_pinned, is_locked, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status !== "all") q = q.eq("status", status) as typeof q;

    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: data ?? [] });
  } else {
    let q = untypedFrom(db, "forum_replies")
      .select("id, post_id, user_id, display_name, content, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (status !== "all") q = q.eq("status", status) as typeof q;

    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: data ?? [] });
  }
}

export async function PATCH(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-forum-patch", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const body = await req.json().catch(() => null) as {
    id?: string;
    type?: string;
    action?: string;
    value?: boolean | string;
  } | null;

  if (!body?.id || !body?.action) {
    return NextResponse.json({ error: "Thiếu ID hoặc action." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const table = body.type === "reply" ? "forum_replies" : "forum_posts";

  let updatePayload: Record<string, unknown> = {};
  let logAction = "";

  switch (body.action) {
    case "pin":
      updatePayload = { is_pinned: body.value };
      logAction = body.value ? "FORUM_POST_PINNED" : "FORUM_POST_UNPINNED";
      break;
    case "lock":
      updatePayload = { is_locked: body.value };
      logAction = body.value ? "FORUM_POST_LOCKED" : "FORUM_POST_UNLOCKED";
      break;
    case "remove":
      updatePayload = { status: "removed" };
      logAction = "FORUM_POST_REMOVED";
      break;
    case "restore":
      updatePayload = { status: "active" };
      logAction = "FORUM_POST_RESTORED";
      break;
    default:
      return NextResponse.json({ error: "Action không hợp lệ." }, { status: 400 });
  }

  const { error } = await untypedFrom(db, table)
    .update(updatePayload as never)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });
  }

  await logAdminActivity({
    action: logAction,
    targetType: "FORUM",
    targetId: body.id,
    summary: `${logAction} id=${body.id}`,
  }).catch(() => {});

  void sendTelegramNotification({
    title: `🛡️ DIỄN ĐÀN: ${logAction.replace(/_/g, " ")}`,
    subtitle: vnNow(),
    sections: [{ rows: [{ label: "ID", value: body.id, mono: true }] }],
    footer: "💬 Arex Admin",
  }).catch(() => null);

  revalidatePath("/cong-dong", "page");
  revalidatePath(`/cong-dong/${body.id}`, "page");

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "admin-forum-delete", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const guard = await enforceAdminApiAuth({ capability: "comments.moderate" });
  if (guard) return guard;

  const body = await req.json().catch(() => null) as { id?: string; type?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Thiếu ID." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });

  const table = body.type === "reply" ? "forum_replies" : "forum_posts";

  const { error } = await untypedFrom(db, table).delete().eq("id", body.id);
  if (error) {
    return NextResponse.json({ error: "Không thể xóa." }, { status: 500 });
  }

  await logAdminActivity({
    action: body.type === "reply" ? "FORUM_REPLY_DELETED" : "FORUM_POST_DELETED",
    targetType: "FORUM",
    targetId: body.id,
    summary: `Đã xóa ${body.type === "reply" ? "trả lời" : "bài viết"} ${body.id}`,
  }).catch(() => {});

  void sendTelegramNotification({
    title: `🗑️ DIỄN ĐÀN: ${body.type === "reply" ? "XÓA TRẢ LỜI" : "XÓA BÀI VIẾT"}`,
    subtitle: vnNow(),
    sections: [{ rows: [{ label: "ID", value: body.id, mono: true }] }],
    footer: "💬 Arex Admin",
  }).catch(() => null);

  revalidatePath("/cong-dong", "page");

  return NextResponse.json({ ok: true });
}
