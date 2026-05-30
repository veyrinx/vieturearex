import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";

type ContributorRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  posts_count: number;
  replies_count: number;
  wiki_count: number;
  total_points: number;
  badge: string;
  updated_at: string;
};

const patchSchema = z.object({
  user_id:      z.string().min(1),
  total_points: z.number().int().min(0).optional(),
  badge:        z.enum(["member", "contributor", "veteran", "legend"]).optional(),
  posts_count:  z.number().int().min(0).optional(),
  replies_count: z.number().int().min(0).optional(),
  wiki_count:   z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-contributors", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ contributors: [] });

  const { data } = await (untypedFrom(db, "contributor_points")
    .select("user_id, display_name, avatar_url, posts_count, replies_count, wiki_count, total_points, badge, updated_at")
    .order("total_points", { ascending: false })
    .limit(200) as unknown as Promise<{ data: ContributorRow[] | null }>);

  return NextResponse.json({ contributors: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-contributors-patch", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const { user_id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "contributor_points")
    .update({ ...updates, updated_at: new Date().toISOString() } as never)
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: "Không thể cập nhật" }, { status: 500 });

  void logAdminActivity({
    action: "contributor_update",
    targetType: "user",
    targetId: user_id,
    summary: `Cập nhật điểm đóng góp user ${user_id}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-contributors-reset", limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const { scope } = await request.json().catch(() => ({})) as { scope?: string };

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  if (scope === "all") {
    const { error } = await untypedFrom(db, "contributor_points")
      .update({ posts_count: 0, replies_count: 0, wiki_count: 0, total_points: 0, badge: "member", updated_at: new Date().toISOString() } as never)
      .neq("user_id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: "Không thể reset" }, { status: 500 });
  } else {
    return NextResponse.json({ error: "scope phải là 'all'" }, { status: 400 });
  }

  void logAdminActivity({ action: "contributors_reset_all", targetType: "system", targetId: "all", summary: "Reset toàn bộ điểm đóng góp" }).catch(() => null);
  return NextResponse.json({ ok: true });
}
