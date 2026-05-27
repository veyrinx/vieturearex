import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

// Called by Vercel Cron every hour: 0 * * * *
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const now = new Date().toISOString();

  const { data: due, error } = await untypedFrom(db, "news")
    .select("id, title, slug")
    .eq("status", "draft")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now) as { data: { id: string; title: string; slug: string }[] | null; error: unknown };

  if (error || !due || due.length === 0)
    return NextResponse.json({ ok: true, published: 0 });

  const ids = due.map((d) => d.id);
  await untypedFrom(db, "news")
    .update({ status: "published", scheduled_at: null })
    .in("id", ids);

  revalidatePath("/news", "layout");
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, published: ids.length, titles: due.map((d) => d.title) });
}
