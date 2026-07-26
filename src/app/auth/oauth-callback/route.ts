import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { ensureUserAccount } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { awardAchievement } from "@/lib/server/award-achievement";
import { sendWelcomeEmail } from "@/lib/server/email";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { clientNetInfo } from "@/lib/server/client-net";
import { getClientIp } from "@/lib/server/get-client-ip";

/**
 * Callback OAuth cho NGƯỜI DÙNG trang công khai (Google / Facebook).
 * Khác /auth/callback — route đó chỉ dành cho quản trị viên (giới hạn domain email).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get("next") ?? "/";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const loginUrl = new URL("/login", requestUrl.origin);

  // Provider trả lỗi (user bấm huỷ, app chưa cấp quyền…)
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  const code = requestUrl.searchParams.get("code");
  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl || !code) {
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  // Đích cuối cùng quyết định sau khi biết hồ sơ; tạm trỏ về nextPath.
  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options) { response.cookies.set({ name, value, ...options }); },
      remove(name: string, options) { response.cookies.set({ name, value: "", ...options }); },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "missing_user");
    return NextResponse.redirect(loginUrl);
  }

  const provider = user.app_metadata?.provider === "facebook" ? "facebook" : "google";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pickString = (...keys: string[]) => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };
  const providerName = pickString("full_name", "name", "user_name", "preferred_username");
  const providerAvatar = pickString("avatar_url", "picture");

  const adminClient = createAdminSupabaseClient();

  type ProfileRow = {
    display_name: string | null;
    avatar_url: string | null;
    is_banned: boolean | null;
    ff_id: string | null;
  };
  const existing = adminClient
    ? ((await adminClient
        .from("users")
        .select("display_name, avatar_url, is_banned, ff_id")
        .eq("id", user.id)
        .maybeSingle()) as { data: ProfileRow | null }).data
    : null;

  // Tài khoản bị khoá — chặn ngay tại callback.
  if (existing?.is_banned) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "banned");
    return NextResponse.redirect(loginUrl);
  }

  const isNewUser = !existing;

  try {
    // ensureUserAccount giữ nguyên role cũ nếu tài khoản đã tồn tại.
    await ensureUserAccount({ id: user.id, email, role: "user" });
  } catch {
    // Bảng users lỗi — vẫn để người dùng vào, hồ sơ sẽ tạo lại ở lần sau.
  }

  // Điền tên / avatar từ provider khi hồ sơ còn trống (không ghi đè dữ liệu người dùng tự đặt).
  if (adminClient) {
    const patch: Record<string, string> = {};
    if (!existing?.display_name && providerName) patch.display_name = providerName;
    if (!existing?.avatar_url && providerAvatar) patch.avatar_url = providerAvatar;
    if (Object.keys(patch).length > 0) {
      await adminClient.from("users").update(patch as never).eq("id", user.id);
    }
  }

  if (isNewUser) {
    void awardAchievement(user.id, "newcomer");
    void sendWelcomeEmail({ to: email, name: providerName }).catch(() => null);
    void logAdminActivity({
      action: "USER_REGISTERED",
      targetType: "USER",
      targetId: user.id,
      summary: `Tài khoản mới đăng ký bằng ${provider}: ${email}`,
    }).catch(() => {});

    const net = clientNetInfo(request);
    void sendTelegramNotification({
      title: "👤 THÀNH VIÊN MỚI ĐĂNG KÝ",
      subtitle: vnNow(),
      sections: [
        {
          icon: "🆕",
          heading: providerName || email.split("@")[0],
          rows: [
            { label: "📧 Email", value: email, mono: true },
            { label: "🏷 Tên hiển thị", value: providerName ?? "Chưa đặt" },
            { label: "🎫 Hình thức", value: provider === "facebook" ? "Đăng nhập Facebook" : "Đăng nhập Google" },
            { label: "🆔 ID", value: user.id, mono: true },
          ],
        },
        {
          icon: "🌐",
          heading: "Thiết bị & mạng",
          rows: [
            { label: "🌍 IP", value: net.ip, mono: true },
            { label: "📱 Thiết bị", value: net.device },
            { label: "🧭 Trình duyệt", value: net.browser },
          ],
        },
      ],
      footer: "✨ Arex Register",
    }).catch(() => null);
  }

  // Nhật ký đăng nhập cho trang hồ sơ.
  if (adminClient) {
    const ip = getClientIp(request);
    try {
      await adminClient.from("login_logs").insert({
        user_id: user.id,
        email,
        ip: ip !== "unknown" ? ip : null,
        user_agent: request.headers.get("user-agent"),
        method: provider,
      } as never);
    } catch { /* non-fatal */ }
  }

  // Chưa có FF ID → đưa qua bước thiết lập, giống luồng đăng nhập bằng mật khẩu.
  // Đổi Location trên chính response để giữ nguyên cookie session vừa được set.
  if (!existing?.ff_id) {
    const setupUrl = new URL(`/setup?next=${encodeURIComponent(nextPath)}`, requestUrl.origin);
    response.headers.set("location", setupUrl.toString());
  }

  return response;
}
