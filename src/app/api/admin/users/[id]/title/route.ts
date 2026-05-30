import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().nullable(),
});

async function getAdminName() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return "Admin";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Admin";
  const { data } = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle() as { data: { display_name: string | null } | null };
  return data?.display_name ?? "Admin";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "users")
    .update({ selected_title: body.data.title } as never)
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Không thể cập nhật danh hiệu" }, { status: 500 });

  const adminName = await getAdminName();
  void logAdminActivity({
    action: "grant_title",
    targetType: "user",
    targetId: id,
    summary: `Cấp danh hiệu "${body.data.title ?? "(bỏ danh hiệu)"}" cho user ${id}`,
    actorEmail: adminName,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
