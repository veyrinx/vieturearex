import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";

const frameSchema = z.object({
  name:        z.string().min(1).max(80),
  css_ring:    z.string().min(1).max(500),
  description: z.string().max(300).optional().nullable(),
  rarity:      z.enum(["common", "rare", "epic", "legendary"]),
  sort_order:  z.number().int().default(0),
  is_active:   z.boolean().default(true),
});

const titleSchema = z.object({
  name:        z.string().min(1).max(80),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().max(300).optional().nullable(),
  rarity:      z.enum(["common", "rare", "epic", "legendary"]),
  requirement: z.string().max(200).optional().nullable(),
  sort_order:  z.number().int().default(0),
  is_active:   z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-cosmetics-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ frames: [], titles: [] });

  const [framesRes, titlesRes] = await Promise.all([
    untypedFrom(db, "avatar_frames")
      .select("id, name, css_ring, description, rarity, sort_order, is_active, created_at")
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: unknown[] | null }>,
    untypedFrom(db, "user_titles")
      .select("id, name, color, description, rarity, requirement, sort_order, is_active, created_at")
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: unknown[] | null }>,
  ]);

  return NextResponse.json({ frames: framesRes.data ?? [], titles: titlesRes.data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-cosmetics-post", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { type, ...data } = body ?? {};

  if (type === "frame") {
    const parsed = frameSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

    const db = createAdminSupabaseClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const { data: row, error } = await untypedFrom(db, "avatar_frames")
      .insert(parsed.data as never)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };

    if (error) return NextResponse.json({ error: "Không thể tạo khung avatar" }, { status: 500 });
    void logAdminActivity({ action: "frame_create", targetType: "frame", targetId: (row as { id: string }).id, summary: `Tạo khung avatar "${parsed.data.name}"` }).catch(() => null);
    return NextResponse.json({ ok: true, id: (row as { id: string }).id });
  }

  if (type === "title") {
    const parsed = titleSchema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

    const db = createAdminSupabaseClient();
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const { data: row, error } = await untypedFrom(db, "user_titles")
      .insert(parsed.data as never)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };

    if (error) return NextResponse.json({ error: "Không thể tạo danh hiệu" }, { status: 500 });
    void logAdminActivity({ action: "title_create", targetType: "title", targetId: (row as { id: string }).id, summary: `Tạo danh hiệu "${parsed.data.name}"` }).catch(() => null);
    return NextResponse.json({ ok: true, id: (row as { id: string }).id });
  }

  return NextResponse.json({ error: "type phải là 'frame' hoặc 'title'" }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-cosmetics-put", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { type, id, ...data } = body ?? {};
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  if (type === "frame") {
    const parsed = frameSchema.partial().safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    const { error } = await untypedFrom(db, "avatar_frames").update(parsed.data as never).eq("id", id);
    if (error) return NextResponse.json({ error: "Không thể cập nhật" }, { status: 500 });
    void logAdminActivity({ action: "frame_update", targetType: "frame", targetId: id, summary: `Cập nhật khung avatar ID ${id}` }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  if (type === "title") {
    const parsed = titleSchema.partial().safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    const { error } = await untypedFrom(db, "user_titles").update(parsed.data as never).eq("id", id);
    if (error) return NextResponse.json({ error: "Không thể cập nhật" }, { status: 500 });
    void logAdminActivity({ action: "title_update", targetType: "title", targetId: id, summary: `Cập nhật danh hiệu ID ${id}` }).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "type phải là 'frame' hoặc 'title'" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-cosmetics-del", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { type, id } = await request.json().catch(() => ({})) as { type?: string; id?: string };
  if (!id || !type) return NextResponse.json({ error: "Thiếu id hoặc type" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const table = type === "frame" ? "avatar_frames" : type === "title" ? "user_titles" : null;
  if (!table) return NextResponse.json({ error: "type không hợp lệ" }, { status: 400 });

  const { error } = await untypedFrom(db, table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Không thể xóa" }, { status: 500 });

  void logAdminActivity({ action: `${type}_delete`, targetType: type, targetId: id, summary: `Xóa ${type} ID ${id}` }).catch(() => null);
  return NextResponse.json({ ok: true });
}
