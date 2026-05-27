import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/data/content-service";
import {
  validateTelegramInitData,
  subscribeUser,
  unsubscribeUser,
  isSubscribed,
} from "@/lib/server/telegram-broadcast";

const TOKEN_KEY = "integrations.telegram_bot_token";

type ResolveResult =
  | { ok: true; user: Awaited<ReturnType<typeof validateTelegramInitData>>["user"] & object }
  | { ok: false; reason: "no_init_data" | "not_configured" | "invalid" };

async function resolveUser(req: NextRequest): Promise<ResolveResult> {
  const initData = req.headers.get("x-telegram-init-data") ?? "";
  if (!initData) return { ok: false, reason: "no_init_data" };
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return { ok: false, reason: "not_configured" };
  const { valid, user } = validateTelegramInitData(initData, token);
  if (!valid || !user) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}

// Check subscription status
export async function GET(req: NextRequest) {
  const result = await resolveUser(req);
  if (!result.ok) {
    return NextResponse.json({
      subscribed: false,
      configured: result.reason !== "not_configured",
      reason: result.reason,
    });
  }
  const subscribed = await isSubscribed(result.user.id);
  return NextResponse.json({ subscribed, configured: true });
}

// Subscribe
export async function POST(req: NextRequest) {
  const result = await resolveUser(req);
  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 401;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }
  await subscribeUser(result.user.id, result.user.first_name, result.user.username);
  return NextResponse.json({ ok: true });
}

// Unsubscribe
export async function DELETE(req: NextRequest) {
  const result = await resolveUser(req);
  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 401;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }
  await unsubscribeUser(result.user.id);
  return NextResponse.json({ ok: true });
}
