import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

// PUT /api/admin/news/bulk — bulk publish/draft/delete
export async function PUT(req: NextRequest) {
  const denied = await enforceAdminApiAuth({ capability: "news.edit" });
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    ids?: string[];
    action?: "publish" | "draft" | "delete";
  };

  if (!Array.isArray(body.ids) || body.ids.length === 0)
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  if (!["publish", "draft", "delete"].includes(body.action ?? ""))
    return NextResponse.json({ error: "invalid action" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "db unavailable" }, { status: 503 });

  const ids = body.ids.slice(0, 100); // cap at 100

  if (body.action === "delete") {
    const denied2 = await enforceAdminApiAuth({ capability: "news.delete" });
    if (denied2) return denied2;
    await untypedFrom(db, "news").delete().in("id", ids);
    await logAdminActivity({
      action: "NEWS_BULK_DELETE",
      targetType: "NEWS",
      summary: `Xóa ${ids.length} bài viết`,
    });
  } else {
    const status = body.action === "publish" ? "published" : "draft";
    await untypedFrom(db, "news").update({ status }).in("id", ids);
    await logAdminActivity({
      action: body.action === "publish" ? "NEWS_BULK_PUBLISH" : "NEWS_BULK_DRAFT",
      targetType: "NEWS",
      summary: `Cập nhật ${ids.length} bài → ${status}`,
    });
  }

  revalidatePath("/news", "layout");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, affected: ids.length });
}
