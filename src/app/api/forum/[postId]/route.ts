import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasImage, plainTextOf } from "@/lib/utils/forum-content";
import { getVoteState, toggleVote } from "@/lib/server/forum-votes";

// Cap the HTML payload; the readable minimum is measured on the visible text.
const editPostSchema = z.object({
  title:   z.string().min(5).max(200),
  content: z.string().min(1).max(200_000),
});

type Ctx = { params: Promise<{ postId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-detail", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json(null, { status: 503 });

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("*")
    .eq("id", postId)
    .eq("status", "active")
    .single() as { data: unknown };

  if (!post) return NextResponse.json(null, { status: 404 });

  // Increment view count (fire & forget)
  void untypedFrom(db, "forum_posts")
    .update({ view_count: ((post as { view_count: number }).view_count ?? 0) + 1 } as never)
    .eq("id", postId);

  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-post-edit", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = editPostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  if (plainTextOf(parsed.data.content).length < 20 && !hasImage(parsed.data.content)) {
    return NextResponse.json({ error: "Nội dung cần ít nhất 20 ký tự." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("user_id")
    .eq("id", postId)
    .single() as { data: { user_id: string } | null };

  if (!post) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: "Không có quyền." }, { status: 403 });

  await untypedFrom(db, "forum_posts")
    .update({ title: parsed.data.title, content: parsed.data.content } as never)
    .eq("id", postId);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-helpful", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Đăng nhập để vote." }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return NextResponse.json({ error: "Đăng nhập để vote." }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { action?: string };
  if (body.action !== "helpful") return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: post } = await untypedFrom(db, "forum_posts")
    .select("user_id, status")
    .eq("id", postId)
    .single() as { data: { user_id: string; status: string } | null };

  if (!post || post.status !== "active") {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (post.user_id === user.id) {
    return NextResponse.json({ error: "Không thể vote bài của mình." }, { status: 400 });
  }

  // Một phiếu một người, giữ bằng khoá chính (post_id, user_id) chứ không phải
  // bằng cờ trong localStorage như bản cũ. Bấm lại là bỏ phiếu.
  try {
    const state = await toggleVote("post", postId, user.id);
    return NextResponse.json({ helpful_count: state.count, voted: state.voted });
  } catch {
    return NextResponse.json({ error: "Không ghi được phiếu." }, { status: 503 });
  }
}

// Trạng thái phiếu của người đang xem. Trang bài viết được cache nên không nhúng
// sẵn được, phía client tự hỏi khi gắn nút.
export async function POST(req: NextRequest, { params }: Ctx) {
  const limited = enforceRateLimit(req, { name: "forum-helpful-state", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { postId } = await params;

  const body = await req.json().catch(() => ({})) as { action?: string };
  if (body.action !== "helpful-state") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const user = supabase
    ? (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user
    : null;

  try {
    const state = await getVoteState("post", postId, user?.id ?? null);
    return NextResponse.json({ helpful_count: state.count, voted: state.voted });
  } catch {
    return NextResponse.json({ helpful_count: 0, voted: false });
  }
}
