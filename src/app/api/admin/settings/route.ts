import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { isSensitiveKey } from "@/lib/server/setting-crypto";
import { isAdminSettingsApiKey, SENSITIVE_CONFIGURED_MASK } from "@/lib/utils/site-settings";

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
  const raw = (await getSettings()).filter((item) => isAdminSettingsApiKey(item.key));
  const settings = raw.map((s) =>
    isSensitiveKey(s.key) ? { ...s, value: s.value ? SENSITIVE_CONFIGURED_MASK : "" } : s,
  );
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
  const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "settings.edit" });
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
  // The permission matrix is gated by its own capability so admins
  // can't widen their own privileges.
  if (sanitizedKey === "permissions.role_capabilities") {
    const denied2 = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "permissions.edit" });
    if (denied2) return denied2;
  }

  const sanitizedValue = sanitizePlainText(parsed.data.value);
  if (isSensitiveKey(sanitizedKey) && (!sanitizedValue || sanitizedValue === SENSITIVE_CONFIGURED_MASK)) {
    return NextResponse.json({ setting: null });
  }

  let setting;
  try {
    setting = await updateSetting(sanitizedKey, sanitizedValue);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật cài đặt." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: setting?.id ?? sanitizedKey,
    summary: `Cập nhật cài đặt ${setting?.key ?? parsed.data.key}`,
  });

  // Revalidate all public pages since settings affect branding, SEO, home content
  revalidatePath("/", "layout");

  return NextResponse.json({ setting });
}
