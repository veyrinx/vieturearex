import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/data/content-service";
import {
  validateTelegramInitData,
  subscribeUser,
  unsubscribeUser,
  isSubscribed,
} from "@/lib/server/telegram-broadcast";

const TOKEN_KEY = "integrations.telegram_bot_token";

async function resolveUser(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data") ?? "";
  if (!initData) return null;
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return null;
  const { valid, user } = validateTelegramInitData(initData, token);
  if (!valid || !user) return null;
  return user;
}

// Check subscription status
export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ subscribed: false });
  const subscribed = await isSubscribed(user.id);
  return NextResponse.json({ subscribed });
}

// Subscribe
export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await subscribeUser(user.id, user.first_name, user.username);
  return NextResponse.json({ ok: true });
}

// Unsubscribe
export async function DELETE(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user)
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await unsubscribeUser(user.id);
  return NextResponse.json({ ok: true });
}
