import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { logAdminActivity } from "@/lib/server/admin-activity";
import {
  SETTINGS_KEY_SOCIAL_PROVIDERS,
  SOCIAL_PROVIDERS,
  isSocialProvider,
  oauthCallbackUrl,
  parseSocialProviders,
} from "@/lib/constants/social-login";
import {
  fetchProviderClientIds,
  fetchProviderStatus,
  hasManagementToken,
  pushProviderConfig,
} from "@/lib/server/supabase-auth-config";

export const dynamic = "force-dynamic";

// GET — trạng thái thật bên Supabase + nút nào đang hiện ở trang đăng nhập.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-social-login", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const [settings, live, clientIds] = await Promise.all([
    getSettings(),
    fetchProviderStatus(),
    fetchProviderClientIds(),
  ]);

  return NextResponse.json({
    providers: SOCIAL_PROVIDERS,
    /** Bật thật bên Supabase — luồng OAuth có chạy hay không. */
    live,
    /** Nút hiện ở /login. */
    shown: parseSocialProviders(
      settings.find((s) => s.key === SETTINGS_KEY_SOCIAL_PROVIDERS)?.value ?? null,
    ),
    clientIds,
    canManage: hasManagementToken(),
    callbackUrl: oauthCallbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
  });
}

const schema = z.object({
  provider: z.string().refine(isSocialProvider, "Provider không hợp lệ."),
  /** Bật provider bên Supabase (cần SUPABASE_ACCESS_TOKEN). */
  enabled: z.boolean(),
  /** Hiện nút ở trang đăng nhập. */
  shown: z.boolean(),
  clientId: z.string().max(300).optional(),
  secret: z.string().max(300).optional(),
});

// PUT — lưu một provider: đẩy sang Supabase (nếu có token) + bật/tắt nút.
export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-social-login", limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { provider, enabled, shown, clientId, secret } = parsed.data;
  if (!isSocialProvider(provider)) {
    return NextResponse.json({ error: "Provider không hợp lệ." }, { status: 400 });
  }

  // Bật nút mà provider chưa chạy = mời người dùng bấm vào một cái lỗi.
  const live = await fetchProviderStatus();
  let pushError: string | null = null;

  if (hasManagementToken()) {
    pushError = await pushProviderConfig({
      provider,
      enabled,
      clientId: clientId?.trim() || undefined,
      secret: secret?.trim() || undefined,
    });
    if (pushError) return NextResponse.json({ error: pushError }, { status: 502 });
  } else if (enabled !== live[provider]) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình SUPABASE_ACCESS_TOKEN nên không bật/tắt provider từ đây được. " +
          "Bật trong Supabase Dashboard → Authentication → Providers, rồi quay lại đây bật nút hiển thị.",
      },
      { status: 400 },
    );
  }

  const willBeLive = hasManagementToken() ? enabled : live[provider];
  if (shown && !willBeLive) {
    return NextResponse.json(
      { error: `${provider} chưa bật bên Supabase — bật xong mới hiện nút được, không thì người dùng bấm vào là lỗi.` },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const current = parseSocialProviders(
    settings.find((s) => s.key === SETTINGS_KEY_SOCIAL_PROVIDERS)?.value ?? null,
  );
  const next = shown
    ? Array.from(new Set([...current, provider]))
    : current.filter((p) => p !== provider);
  await updateSetting(SETTINGS_KEY_SOCIAL_PROVIDERS, JSON.stringify(next));

  await logAdminActivity({
    action: "AUTH_PROVIDER_UPDATED",
    targetType: "SETTINGS",
    targetId: provider,
    summary: `Đăng nhập ${provider}: ${enabled ? "bật" : "tắt"} trên Supabase, nút ${shown ? "hiện" : "ẩn"}`,
  });

  return NextResponse.json({ ok: true, shown: next });
}
