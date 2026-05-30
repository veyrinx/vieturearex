import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

const createSchema = z.object({
  title:     z.string().min(1).max(120),
  message:   z.string().min(1).max(500),
  type:      z.enum(["info", "warning", "success", "error"]).default("info"),
  is_active: z.boolean().default(true),
  starts_at: z.string().optional(),
  ends_at:   z.string().nullable().optional(),
});

async function getAdminName() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return "Admin";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Admin";
  const { data } = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle() as { data: { display_name: string | null } | null };
  return data?.display_name ?? user.email ?? "Admin";
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-broadcast-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ announcements: [] });

  const { data } = await (untypedFrom(db, "system_announcements")
    .select("id, title, message, type, is_active, starts_at, ends_at, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(100) as unknown as Promise<{ data: AnnouncementRow[] | null }>);

  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-broadcast-post", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const adminName = await getAdminName();

  const { data: row, error } = await untypedFrom(db, "system_announcements")
    .insert({
      ...parsed.data,
      starts_at:  parsed.data.starts_at ?? new Date().toISOString(),
      created_by: adminName,
    } as never)
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (error) return NextResponse.json({ error: "Không thể tạo thông báo" }, { status: 500 });

  void logAdminActivity({ action: "broadcast_create", targetType: "announcement", targetId: (row as { id: string }).id, summary: `Tạo thông báo "${parsed.data.title}"` }).catch(() => null);

  return NextResponse.json({ ok: true, id: (row as { id: string }).id }, { status: 201 });
}
