import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText, sanitizeRichText } from "@/lib/server/sanitize";

const POPUP_ENABLED_KEY = "popup.enabled";
const POPUP_CONTENT_KEY = "popup.content";
const POPUP_TITLE_KEY = "popup.title";
const POPUP_IMAGE_URL_KEY = "popup.image_url";
const POPUP_LINK_URL_KEY = "popup.link_url";

const popupSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(200),
  content: z.string().max(50000),
  image_url: z.string().max(500).optional().default(""),
  link_url: z.string().max(500).optional().default(""),
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
    image_url: map[POPUP_IMAGE_URL_KEY] ?? "",
    link_url: map[POPUP_LINK_URL_KEY] ?? "",
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

  try {
    await Promise.all([
      updateSetting(POPUP_ENABLED_KEY, String(parsed.data.enabled)),
      updateSetting(POPUP_TITLE_KEY, sanitizedTitle),
      updateSetting(POPUP_CONTENT_KEY, sanitizedContent),
      updateSetting(POPUP_IMAGE_URL_KEY, (parsed.data.image_url ?? "").trim().slice(0, 500)),
      updateSetting(POPUP_LINK_URL_KEY, (parsed.data.link_url ?? "").trim().slice(0, 500)),
    ]);
  } catch {
    return NextResponse.json({ error: "Không thể lưu cài đặt popup." }, { status: 500 });
  }

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: POPUP_ENABLED_KEY,
    summary: `Cập nhật popup thông báo: ${parsed.data.enabled ? "BẬT" : "TẮT"}`,
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
