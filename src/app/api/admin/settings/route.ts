import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { isAdminSettingsApiKey } from "@/lib/utils/site-settings";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-settings",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) {
    return denied;
  }
  const settings = (await getSettings()).filter((item) => isAdminSettingsApiKey(item.key));
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-settings",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) {
    return denied;
  }

  const payload = await request.json().catch(() => null);
  const parsed = settingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }

  const sanitizedKey = sanitizePlainText(parsed.data.key);
  if (!isAdminSettingsApiKey(sanitizedKey)) {
    return NextResponse.json(
      { error: "Setting key is not editable from this route." },
      { status: 400 },
    );
  }

  const setting = await updateSetting(sanitizedKey, sanitizePlainText(parsed.data.value));

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: setting?.id ?? sanitizedKey,
    summary: `Cập nhật cài đặt ${setting?.key ?? parsed.data.key}`,
  });

  return NextResponse.json({ setting });
}
