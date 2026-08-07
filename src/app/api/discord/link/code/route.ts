import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { getLinkByUserId, issueLinkCode } from "@/lib/server/discord-link";

/** Tạo / xem / gỡ liên kết Discord của người đang đăng nhập trên web. */

const NO_STORE = { "cache-control": "no-store, private" } as const;

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401, headers: NO_STORE });
  }

  const link = await getLinkByUserId(auth.userId);
  return NextResponse.json(
    {
      linked: !!link,
      // Chỉ trả tên hiển thị, không trả snowflake — trang web không cần nó.
      username: link?.discord_username ?? null,
      linkedAt: link?.linked_at ?? null,
    },
    { headers: NO_STORE },
  );
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "discord-link-code", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) {
    return NextResponse.json({ error: "Hãy đăng nhập." }, { status: 401, headers: NO_STORE });
  }

  const issued = await issueLinkCode(auth.userId);
  if (!issued) {
    return NextResponse.json({ error: "Không tạo được mã." }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(issued, { headers: NO_STORE });
}

export async function DELETE() {
  const auth = await getAuthContext();
  if (!auth.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401, headers: NO_STORE });
  }

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { untypedFrom } = await import("@/lib/supabase/untyped");
  const db = createAdminSupabaseClient();
  if (db) {
    await untypedFrom(db, "discord_account_links").delete().eq("user_id", auth.userId);
    await untypedFrom(db, "discord_link_codes").delete().eq("user_id", auth.userId);
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
