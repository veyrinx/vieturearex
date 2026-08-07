import { NextRequest, NextResponse } from "next/server";
import { getLinkByDiscordId, syncDiscordRoles } from "@/lib/server/discord-link";

/**
 * Bot gateway gọi khi có người vào server: nếu tài khoản Discord đó từng liên
 * kết với Arex thì trả lại đúng bộ role (đã liên kết / người bán / giao dịch
 * viên / nhân sự).
 *
 * Không trả về bất cứ thông tin tài khoản nào — chỉ báo có liên kết hay không.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_SECRET = process.env.BOT_API_SECRET;

export async function POST(req: NextRequest) {
  if (!BOT_SECRET || req.headers.get("x-bot-secret") !== BOT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { discordUserId?: unknown };
  const discordUserId = typeof body.discordUserId === "string" ? body.discordUserId : "";
  if (!/^\d{5,25}$/.test(discordUserId)) {
    return NextResponse.json({ error: "bad discordUserId" }, { status: 400 });
  }

  const link = await getLinkByDiscordId(discordUserId);
  if (!link) return NextResponse.json({ linked: false });

  await syncDiscordRoles(link.user_id, discordUserId);
  return NextResponse.json({ linked: true });
}
