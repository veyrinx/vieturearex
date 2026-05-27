import "server-only";
import type { NextRequest } from "next/server";
import { getSettings } from "@/lib/data/content-service";
import { validateTelegramInitData, type TgInitUser } from "@/lib/server/telegram-broadcast";

const TOKEN_KEY = "integrations.telegram_bot_token";

export type TgResolveResult =
  | { ok: true; user: TgInitUser & object }
  | { ok: false; reason: "no_init_data" | "not_configured" | "invalid" };

export async function resolveTgUser(req: NextRequest): Promise<TgResolveResult> {
  const initData = req.headers.get("x-telegram-init-data") ?? "";
  if (!initData) return { ok: false, reason: "no_init_data" };
  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  if (!token) return { ok: false, reason: "not_configured" };
  const { valid, user } = validateTelegramInitData(initData, token);
  if (!valid || !user) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}
