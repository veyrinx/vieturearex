import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getUsers } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

export const dynamic = "force-dynamic";

export type MailRecipient = {
  email: string;
  name: string | null;
  role: string | null;
  /** "user" = tài khoản trên site, "newsletter" = người đăng ký nhận tin. */
  source: "user" | "newsletter";
};

const isEmail = (v: string) => /.+@.+\..+/.test(v);

/** Người đăng ký nhận tin — bảng riêng, phần lớn không có tài khoản. */
async function newsletterEmails(): Promise<string[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "newsletter_subscribers")
      .select("email")
      .limit(5000)) as { data: { email: string | null }[] | null };
    return (data ?? []).map((r) => r.email ?? "").filter(isEmail);
  } catch {
    return [];
  }
}

/**
 * Danh sách người nhận cho trang gửi email.
 *
 * Trả gọn (email + tên + vai) chứ không dùng /api/admin/users: trang này chỉ
 * cần chừng đó, mà bảng users thì kéo về cả avatar, bio, điện thoại…
 *
 * Tài khoản bị khoá không xuất hiện: gửi thư mời cho người vừa bị cấm là chuyện
 * không ai muốn giải thích.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "mail-recipients", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const [users, newsletter] = await Promise.all([
    getUsers().catch(() => []),
    newsletterEmails(),
  ]);

  const seen = new Set<string>();
  const list: MailRecipient[] = [];

  for (const u of users) {
    const email = (u.email ?? "").trim().toLowerCase();
    if (!isEmail(email) || u.is_banned || seen.has(email)) continue;
    seen.add(email);
    list.push({ email, name: u.display_name, role: u.role, source: "user" });
  }

  for (const raw of newsletter) {
    const email = raw.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    list.push({ email, name: null, role: null, source: "newsletter" });
  }

  return NextResponse.json({ recipients: list, total: list.length });
}
