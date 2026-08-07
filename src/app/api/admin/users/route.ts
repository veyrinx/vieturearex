import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsers, updateUserRole, updateUserBadges, updateUserInfo, deleteUser, banUser, getUserByEmail, updateUserIsVerified, getSettings } from "@/lib/data/content-service";
import { MAX_USER_BADGES, USER_BADGE_MAP, normalizeBadges } from "@/lib/constants/user-badges";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { getResolvedRoles, getRoleLevel, BUILTIN_ROLE_LEVELS } from "@/lib/permissions";

/**
 * Cấp của vai trò builtin. Trước đây chép tay ở đây nên thiếu team_member,
 * agent, seller — người mang các vai đó bị coi là cấp 0, ai cũng sửa được.
 * Giờ lấy thẳng từ nguồn chung, thêm vai trò mới là chỗ này tự có.
 */
const ROLE_HIERARCHY: Record<string, number> = BUILTIN_ROLE_LEVELS;

async function getCallerRole(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle() as { data: { role: string } | null };
  return data?.role ?? (user.app_metadata?.role as string | undefined) ?? null;
}

// Chấp nhận bất kỳ role key hợp lệ (builtin + custom trong settings). Việc role
// đó có tồn tại hay không được kiểm tra động ở handler (getResolvedRoles).
const updateRoleSchema = z.object({
  id: z.string().min(1),
  role: z.string().regex(/^[a-z0-9_]{1,32}$/, "Role không hợp lệ"),
});

const updateBadgesSchema = z.object({
  id: z.string().min(1),
  action: z.literal("update_badges"),
  badges: z.array(z.string().regex(/^[a-z0-9_]{1,32}$/)).max(MAX_USER_BADGES),
});

const updateBanSchema = z.object({
  id: z.string().min(1),
  is_banned: z.boolean(),
});

const updateVerifySchema = z.object({
  id: z.string().min(1),
  is_verified: z.boolean(),
});

const deleteUserSchema = z.object({
  id: z.string().min(1),
});

const updateInfoSchema = z.object({
  id: z.string().min(1),
  action: z.literal("update_info"),
  display_name: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-users", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-users", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json();

  // Handle update user info (super_admin only)
  const infoParsed = updateInfoSchema.safeParse(payload);
  if (infoParsed.success) {
    // Sửa tên/bio/điện thoại: từ cấp admin trở lên (khớp với giao diện — hộp
    // thoại sửa user vẫn cho admin gõ mấy ô này, trước đây API chặn ở
    // super_admin nên bấm lưu là ăn 403).
    const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "users.edit" });
    if (denied) return denied;

    if (!infoParsed.data.display_name && !infoParsed.data.email && infoParsed.data.bio === undefined && infoParsed.data.phone === undefined) {
      return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
    }

    const callerRole = await getCallerRole();

    // Đổi email = đổi tài khoản đăng nhập → vẫn giữ ở super_admin / IT.
    if (infoParsed.data.email !== undefined && callerRole !== "super_admin" && callerRole !== "it") {
      return NextResponse.json(
        { error: "Chỉ super_admin hoặc IT mới đổi được email tài khoản." },
        { status: 403 },
      );
    }

    // Không cho sửa thông tin của người bằng hoặc cao cấp hơn mình.
    if (callerRole !== "super_admin") {
      const allUsers = await getUsers();
      const target = allUsers.find((u) => u.id === infoParsed.data.id);
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const callerLevel = ROLE_HIERARCHY[callerRole ?? ""] ?? 0;
      if ((ROLE_HIERARCHY[target.role] ?? 0) >= callerLevel) {
        return NextResponse.json(
          { error: "Không thể sửa thông tin của người có quyền bằng hoặc cao hơn bạn." },
          { status: 403 },
        );
      }
    }

    let user;
    try {
      user = await updateUserInfo(infoParsed.data.id, {
        display_name: infoParsed.data.display_name,
        email: infoParsed.data.email,
        bio: infoParsed.data.bio,
        phone: infoParsed.data.phone,
      });
    } catch (error) {
      // Trước đây lỗi này ném thẳng ra ngoài → 500 trắng, giao diện chỉ hiện
      // "Không thể cập nhật." mà không nói vì sao.
      const msg = error instanceof Error ? error.message : "Không thể cập nhật thông tin.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    await logAdminActivity({
      action: "USER_INFO_UPDATED",
      targetType: "USER",
      targetId: user.id,
      summary: `Cập nhật thông tin tài khoản ${user.email}`,
    });
    return NextResponse.json({ user });
  }

  // Handle badges — nhãn hiển thị, tách riêng khỏi role (không cấp quyền gì).
  // Ai gán được nhãn nào phụ thuộc cấp bậc: cấp của người gán phải >= minLevel
  // của nhãn, và phải cao hơn cấp của người bị gán.
  const badgesParsed = updateBadgesSchema.safeParse(payload);
  if (badgesParsed.success) {
    const denied = await enforceAdminApiAuth({ minimumRole: "support" });
    if (denied) return denied;

    const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
    const resolved = getResolvedRoles(
      settings.find((s) => s.key === "permissions.custom_roles")?.value,
      settings.find((s) => s.key === "permissions.role_capabilities")?.value,
    );

    const callerRole = await getCallerRole();
    const callerLevel = getRoleLevel(callerRole, resolved);

    const allUsers = await getUsers();
    const target = allUsers.find((u) => u.id === badgesParsed.data.id);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (callerRole !== "super_admin" && getRoleLevel(target.role, resolved) >= callerLevel) {
      return NextResponse.json(
        { error: "Không thể gán nhãn cho người có quyền bằng hoặc cao hơn bạn." },
        { status: 403 },
      );
    }

    const next = normalizeBadges(badgesParsed.data.badges);
    const before = normalizeBadges(target.badges);
    // Chỉ những nhãn thực sự thêm/bớt mới cần quyền — nhãn cấp cao sẵn có của
    // target được giữ nguyên mà không chặn người cấp thấp sửa các nhãn khác.
    const changed = [
      ...next.filter((b) => !before.includes(b)),
      ...before.filter((b) => !next.includes(b)),
    ];
    const blocked = changed.filter((b) => callerLevel < (USER_BADGE_MAP[b]?.minLevel ?? Infinity));
    if (blocked.length > 0) {
      const names = blocked.map((b) => USER_BADGE_MAP[b]?.label ?? b).join(", ");
      return NextResponse.json(
        { error: `Bạn không đủ quyền gán / thu hồi nhãn: ${names}.` },
        { status: 403 },
      );
    }

    if (changed.length === 0) {
      return NextResponse.json({ user: target });
    }

    const user = await updateUserBadges(badgesParsed.data.id, next);
    await logAdminActivity({
      action: "USER_BADGES_UPDATED",
      targetType: "USER",
      targetId: user.id,
      summary: `Cập nhật nhãn ${user.email}: ${next.length ? next.join(", ") : "(trống)"}`,
    });
    return NextResponse.json({ user });
  }

  // Handle verify/unverify (IT only)
  const verifyParsed = updateVerifySchema.safeParse(payload);
  if (verifyParsed.success && "is_verified" in payload) {
    const denied = await enforceAdminApiAuth({ minimumRole: "it" });
    if (denied) return denied;

    const user = await updateUserIsVerified(verifyParsed.data.id, verifyParsed.data.is_verified);
    await logAdminActivity({
      action: verifyParsed.data.is_verified ? "USER_VERIFIED" : "USER_UNVERIFIED",
      targetType: "USER",
      targetId: user.id,
      summary: `${verifyParsed.data.is_verified ? "Cấp" : "Thu hồi"} tích xanh cho ${user.email}`,
    });
    return NextResponse.json({ user });
  }

  // Handle ban/unban
  const banParsed = updateBanSchema.safeParse(payload);
  if (banParsed.success) {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "users.ban" });
    if (denied) return denied;

    const callerRole = await getCallerRole();
    const callerLevel = ROLE_HIERARCHY[callerRole ?? ""] ?? 0;

    // Look up target user to check their role
    const allUsers = await getUsers();
    const target = allUsers.find((u) => u.id === banParsed.data.id);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const targetLevel = ROLE_HIERARCHY[target.role] ?? 0;
    if (targetLevel >= callerLevel) {
      return NextResponse.json({ error: "Không thể khóa tài khoản có quyền bằng hoặc cao hơn bạn." }, { status: 403 });
    }

    const user = await banUser(banParsed.data.id, banParsed.data.is_banned);
    await logAdminActivity({
      action: banParsed.data.is_banned ? "USER_BANNED" : "USER_UNBANNED",
      targetType: "USER",
      targetId: user.id,
      summary: `${banParsed.data.is_banned ? "Khóa" : "Mở khóa"} tài khoản ${user.email}`,
    });
    void sendTelegramNotification({
      title: banParsed.data.is_banned ? "🔒 TÀI KHOẢN BỊ KHÓA" : "🔓 TÀI KHOẢN ĐƯỢC MỞ KHÓA",
      subtitle: vnNow(),
      sections: [{
        rows: [
          { label: "User", value: user.email ?? user.id, bold: true },
          { label: "Trạng thái", value: banParsed.data.is_banned ? "Đã khóa" : "Đã mở khóa", status: banParsed.data.is_banned ? "err" : "ok" },
        ],
      }],
      footer: "👤 Arex Admin",
    }).catch(() => null);
    return NextResponse.json({ user });
  }

  // Handle role update
  const roleParsed = updateRoleSchema.safeParse(payload);
  if (!roleParsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const targetRole = roleParsed.data.role;

  // Resolve roles từ settings (builtin + custom) → cho phép gán role tuỳ biến.
  // "Tự đồng bộ": thêm custom role trong /admin/settings → Phân quyền là dùng ngay,
  // không cần đổi code hay chạy migration DB.
  const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
  const resolved = getResolvedRoles(
    settings.find((s) => s.key === "permissions.custom_roles")?.value,
    settings.find((s) => s.key === "permissions.role_capabilities")?.value,
  );
  const targetMeta = resolved.find((r) => r.key === targetRole);
  if (!targetMeta) {
    return NextResponse.json(
      { error: `Role "${targetRole}" không tồn tại. Tạo trong /admin/settings → Phân quyền trước.` },
      { status: 400 },
    );
  }

  const ADMIN_LEVEL = BUILTIN_ROLE_LEVELS.admin;
  if (targetMeta.level >= ADMIN_LEVEL) {
    // Gán role cấp admin trở lên → chỉ super_admin
    const denied = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "users.edit" });
    if (denied) return denied;
  } else {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "users.edit" });
    if (denied) return denied;

    // Admin không được đổi role của người đang ở cấp admin trở lên
    const callerRole = await getCallerRole();
    if (callerRole !== "super_admin") {
      const allUsers = await getUsers();
      const target = allUsers.find((u) => u.id === roleParsed.data.id);
      if (target && getRoleLevel(target.role, resolved) >= ADMIN_LEVEL) {
        return NextResponse.json({ error: "Không thể thay đổi quyền của admin khác." }, { status: 403 });
      }
    }
  }

  const user = await updateUserRole(roleParsed.data.id, targetRole as never);
  await logAdminActivity({
    action: "USER_ROLE_UPDATED",
    targetType: "USER",
    targetId: user.id,
    summary: `Cập nhật vai trò ${user.email} thành ${user.role}`,
  });
  void sendTelegramNotification({
    title: "🛡️ ĐỔI QUYỀN TÀI KHOẢN",
    subtitle: vnNow(),
    sections: [{
      rows: [
        { label: "User", value: user.email ?? user.id, bold: true },
        { label: "Quyền mới", value: targetRole, status: "info" },
      ],
    }],
    footer: "👤 Arex Admin",
  }).catch(() => null);
  return NextResponse.json({ user });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-users-delete", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin", capability: "users.delete" });
  if (denied) return denied;

  const payload = await request.json();
  const parsed = deleteUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    await deleteUser(parsed.data.id);
    await logAdminActivity({
      action: "USER_DELETED",
      targetType: "USER",
      targetId: parsed.data.id,
      summary: `Xóa người dùng ID ${parsed.data.id}`,
    });
    void sendTelegramNotification({
      title: "🗑️ TÀI KHOẢN BỊ XÓA",
      subtitle: vnNow(),
      sections: [{
        rows: [{ label: "User ID", value: parsed.data.id, mono: true, status: "warn" }],
      }],
      footer: "👤 Arex Admin",
    }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to delete user.";
    void sendTelegramNotification({
      title: "❌ LỖI XÓA TÀI KHOẢN",
      subtitle: vnNow(),
      sections: [{ rows: [
        { label: "User ID", value: parsed.data.id, mono: true },
        { label: "Chi tiết", value: msg.slice(0, 300), status: "err" },
      ]}],
      footer: "⚠️ Arex Admin",
    }).catch(() => null);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
