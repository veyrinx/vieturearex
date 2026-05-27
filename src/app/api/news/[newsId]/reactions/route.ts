import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";
import { enforceRateLimit } from "@/lib/server/api-guard";

const REACTIONS = ["fire", "heart", "wow", "haha", "sad"] as const;
type Reaction = (typeof REACTIONS)[number];
const schema = z.object({ reaction: z.enum(REACTIONS) });

type RouteCtx = { params: Promise<{ newsId: string }> };

async function getUser() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return user;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const { newsId } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ counts: {}, myReaction: null });

  const user = await getUser();

  const { data: rows } = (await untypedFrom(db, "news_reactions")
    .select("reaction, user_id")
    .eq("news_id", newsId)) as { data: { reaction: string; user_id: string }[] | null };

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;
  for (const r of rows ?? []) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (user && r.user_id === user.id) myReaction = r.reaction;
  }

  return NextResponse.json({ counts, myReaction });
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { newsId } = await params;
  const limited = enforceRateLimit(req, { name: "reactions", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Upsert — same user changing reaction just updates
  const { error } = await untypedFrom(db, "news_reactions").upsert(
    { news_id: newsId, user_id: user.id, reaction: parsed.data.reaction } as never,
    { onConflict: "news_id,user_id" },
  );

  if (error) return NextResponse.json({ error: "Không thể lưu reaction." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  const { newsId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "news_reactions")
    .delete()
    .eq("news_id", newsId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
