import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { tbl } from "@/lib/server/craftland";

export const dynamic = "force-dynamic";

/** Danh sách bài đã đọc / đã lưu của người đăng nhập — để vẽ tiến độ học. */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "craftland-academy", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ signedIn: false, read: [], bookmarked: [] });
  const { data } = (await tbl("craftland_academy_progress").select("article_id, read_at, bookmarked").eq("user_id", auth.userId).limit(2000)) as unknown as {
    data: Array<{ article_id: string; read_at: string | null; bookmarked: boolean }> | null;
  };
  const rows = data ?? [];
  return NextResponse.json({
    signedIn: true,
    read: rows.filter((r) => r.read_at).map((r) => r.article_id),
    bookmarked: rows.filter((r) => r.bookmarked).map((r) => r.article_id),
  });
}
