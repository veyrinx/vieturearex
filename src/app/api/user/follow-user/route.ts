import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

const schema = z.object({ user_id: z.string().uuid() });

async function getUser() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return user;
}

// GET: counts + status with target user (?target=uuid)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get("target");
  if (!target) return NextResponse.json({ error: "Missing target" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [followersRes, followingRes] = await Promise.all([
    untypedFrom(db, "user_user_follows").select("*", { count: "exact", head: true }).eq("following_id", target) as unknown as Promise<{ count: number | null }>,
    untypedFrom(db, "user_user_follows").select("*", { count: "exact", head: true }).eq("follower_id", target) as unknown as Promise<{ count: number | null }>,
  ]);

  const user = await getUser();
  let isFollowing = false;
  if (user && user.id !== target) {
    const { data } = await untypedFrom(db, "user_user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", target)
      .maybeSingle() as { data: { id: string } | null };
    isFollowing = !!data;
  }

  return NextResponse.json({
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    isFollowing,
  });
}

// POST: follow a user
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "follow-user", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (parsed.data.user_id === user.id) {
    return NextResponse.json({ error: "Không thể tự follow chính mình." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Check target user exists
  const { data: targetUser } = await untypedFrom(db, "users")
    .select("id, display_name")
    .eq("id", parsed.data.user_id)
    .maybeSingle() as { data: { id: string; display_name: string | null } | null };
  if (!targetUser) return NextResponse.json({ error: "Người dùng không tồn tại." }, { status: 404 });

  const { error } = await untypedFrom(db, "user_user_follows").insert({
    follower_id: user.id,
    following_id: parsed.data.user_id,
  } as never);

  // Ignore duplicate-key (already following)
  if (error) {
    const msg = String(error);
    if (!msg.includes("duplicate") && !msg.includes("23505")) {
      return NextResponse.json({ error: "Không thể follow." }, { status: 500 });
    }
  } else {
    // Send notification (non-fatal)
    const { data: profile } = await untypedFrom(db, "users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle() as { data: { display_name: string | null } | null };
    const followerName = profile?.display_name ?? user.email?.split("@")[0] ?? "Ai đó";
    // Đường dẫn TƯƠNG ĐỐI — tránh phụ thuộc NEXT_PUBLIC_SITE_URL (có thể sai định
    // dạng gây URL hỏng/404). Email tự ghép domain qua siteConfig.url.
    void import("@/lib/server/notifications").then(({ createNotification }) =>
      createNotification({
        user_id: parsed.data.user_id,
        type: "user_follow",
        title: `${followerName} đã follow bạn`,
        body: "Xem hồ sơ và follow lại",
        entity_type: "user",
        entity_id: user.id,
        entity_url: `/u/${user.id}`,
      }),
    );
  }

  return NextResponse.json({ ok: true });
}

// DELETE: unfollow
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "follow-user", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "user_user_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", parsed.data.user_id);

  return NextResponse.json({ ok: true });
}
