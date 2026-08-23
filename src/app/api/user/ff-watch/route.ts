import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { untypedFrom } from "@/lib/supabase/untyped";
import { normalizePlayerUid } from "@/lib/server/ff-api";
import type { PlayerChange, PlayerSnapshot } from "@/lib/server/ff-watch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Trần số nick mỗi người ghim — chặn một tài khoản ăn hết quota API FF. */
const MAX_WATCHES = 20;

async function currentUserId(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return data.user?.id ?? null;
}

/** GET — danh sách nick đang theo dõi, kèm chỉ số mới nhất và biến động gần đây. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ loggedIn: false, watches: [] });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ loggedIn: true, watches: [] });

  const { data: watches } = (await untypedFrom(db, "ff_player_watches")
    .select("id, ff_id, label, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })) as {
    data: { id: string; ff_id: string; label: string | null; created_at: string }[] | null;
  };

  const rows = watches ?? [];
  if (rows.length === 0) return NextResponse.json({ loggedIn: true, watches: [] });

  const ffIds = rows.map((r) => r.ff_id);

  // Lấy gộp một lượt rồi ghép trong JS: 20 nick × 2 truy vấn là quá nhiều
  // round-trip cho một trang chỉ để hiển thị.
  const [{ data: snaps }, { data: changes }] = await Promise.all([
    untypedFrom(db, "ff_player_snapshots")
      .select("ff_id, nickname, level, likes, br_rank_point, cs_rank_point, guild_name, guild_level, captured_at")
      .in("ff_id", ffIds)
      .order("captured_at", { ascending: false }) as unknown as Promise<{ data: PlayerSnapshot[] | null }>,
    untypedFrom(db, "ff_player_changes")
      .select("ff_id, field, old_value, new_value, changed_at")
      .in("ff_id", ffIds)
      .order("changed_at", { ascending: false })
      .limit(200) as unknown as Promise<{ data: PlayerChange[] | null }>,
  ]);

  const latest = new Map<string, PlayerSnapshot>();
  for (const s of snaps ?? []) if (!latest.has(s.ff_id)) latest.set(s.ff_id, s);

  const byPlayer = new Map<string, PlayerChange[]>();
  for (const c of changes ?? []) {
    const list = byPlayer.get(c.ff_id) ?? [];
    if (list.length < 5) list.push(c);
    byPlayer.set(c.ff_id, list);
  }

  return NextResponse.json({
    loggedIn: true,
    max: MAX_WATCHES,
    watches: rows.map((w) => ({
      ...w,
      snapshot: latest.get(w.ff_id) ?? null,
      recentChanges: byPlayer.get(w.ff_id) ?? [],
    })),
  });
}

/** POST { uid, label? } — ghim thêm một nick. */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "ff-watch-add", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { uid?: string; label?: string };
  const ffId = normalizePlayerUid(String(body.uid ?? ""));
  if (!ffId) return NextResponse.json({ error: "UID không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không kết nối được cơ sở dữ liệu." }, { status: 500 });

  const { count } = (await untypedFrom(db, "ff_player_watches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)) as { count: number | null };

  if ((count ?? 0) >= MAX_WATCHES) {
    return NextResponse.json(
      { error: `Chỉ theo dõi được tối đa ${MAX_WATCHES} nick. Bỏ bớt rồi thêm lại.` },
      { status: 400 },
    );
  }

  const label = body.label?.trim().slice(0, 60) || null;
  const { error } = (await untypedFrom(db, "ff_player_watches").upsert(
    { user_id: userId, ff_id: ffId, label } as never,
    { onConflict: "user_id,ff_id" },
  )) as { error: { message?: string } | null };

  if (error) {
    return NextResponse.json({ error: error.message ?? "Không lưu được." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ff_id: ffId });
}

/** DELETE ?uid=… — bỏ ghim. */
export async function DELETE(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const uid = new URL(request.url).searchParams.get("uid") ?? "";
  const ffId = normalizePlayerUid(uid);
  if (!ffId) return NextResponse.json({ error: "UID không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không kết nối được cơ sở dữ liệu." }, { status: 500 });

  await untypedFrom(db, "ff_player_watches").delete().eq("user_id", userId).eq("ff_id", ffId);
  return NextResponse.json({ ok: true });
}
