import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText, sanitizeRichText } from "@/lib/server/sanitize";

const POPUP_ENABLED_KEY = "popup.enabled";
const POPUP_CONTENT_KEY = "popup.content";
const POPUP_TITLE_KEY = "popup.title";

const popupSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(200),
  content: z.string().max(50000),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "popup-get", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const settings = await getSettings();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json({
    enabled: map[POPUP_ENABLED_KEY] === "true",
    title: map[POPUP_TITLE_KEY] ?? "",
    content: map[POPUP_CONTENT_KEY] ?? "",
  });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "popup-patch", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = popupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const sanitizedTitle = sanitizePlainText(parsed.data.title).slice(0, 200);
  const sanitizedContent = sanitizeRichText(parsed.data.content).slice(0, 50_000);

  await Promise.all([
    updateSetting(POPUP_ENABLED_KEY, String(parsed.data.enabled)),
    updateSetting(POPUP_TITLE_KEY, sanitizedTitle),
    updateSetting(POPUP_CONTENT_KEY, sanitizedContent),
  ]);

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: POPUP_ENABLED_KEY,
    summary: `Cập nhật popup thông báo: ${parsed.data.enabled ? "BẬT" : "TẮT"}`,
  });

  return NextResponse.json({ ok: true });
}
