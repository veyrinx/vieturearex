import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsers, updateUserRole, updateUserInfo, deleteUser, banUser, getUserByEmail } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ROLE_HIERARCHY: Record<string, number> = {
  it: 150, super_admin: 100, admin: 80, manager: 60, support: 40, user: 20,
};

async function getCallerRole(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle() as { data: { role: string } | null };
  return data?.role ?? (user.app_metadata?.role as string | undefined) ?? null;
}

const updateRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["super_admin", "admin", "it", "manager", "support", "user"]),
});

const updateBanSchema = z.object({
  id: z.string().min(1),
  is_banned: z.boolean(),
});

const deleteUserSchema = z.object({
  id: z.string().min(1),
});

const updateInfoSchema = z.object({
  id: z.string().min(1),
  action: z.literal("update_info"),
  display_name: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
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
    const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
    if (denied) return denied;

    if (!infoParsed.data.display_name && !infoParsed.data.email) {
      return NextResponse.json({ error: "Không có thông tin nào để cập nhật." }, { status: 400 });
    }

    const user = await updateUserInfo(infoParsed.data.id, {
      display_name: infoParsed.data.display_name,
      email: infoParsed.data.email,
    });
    await logAdminActivity({
      action: "USER_INFO_UPDATED",
      targetType: "USER",
      targetId: user.id,
      summary: `Cập nhật thông tin tài khoản ${user.email}`,
    });
    return NextResponse.json({ user });
  }

  // Handle ban/unban
  const banParsed = updateBanSchema.safeParse(payload);
  if (banParsed.success) {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
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
    return NextResponse.json({ user });
  }

  // Handle role update
  const roleParsed = updateRoleSchema.safeParse(payload);
  if (!roleParsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const targetRole = roleParsed.data.role;
  if (targetRole === "super_admin" || targetRole === "admin" || targetRole === "it") {
    const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
    if (denied) return denied;
  } else {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
    if (denied) return denied;

    // Admin cannot change role of another admin/super_admin
    const callerRole = await getCallerRole();
    if (callerRole !== "super_admin") {
      const allUsers = await getUsers();
      const target = allUsers.find((u) => u.id === roleParsed.data.id);
      if (target && (ROLE_HIERARCHY[target.role] ?? 0) >= (ROLE_HIERARCHY["admin"] ?? 0)) {
        return NextResponse.json({ error: "Không thể thay đổi quyền của admin khác." }, { status: 403 });
      }
    }
  }

  const user = await updateUserRole(roleParsed.data.id, targetRole);
  await logAdminActivity({
    action: "USER_ROLE_UPDATED",
    targetType: "USER",
    targetId: user.id,
    summary: `Cập nhật vai trò ${user.email} thành ${user.role}`,
  });
  return NextResponse.json({ user });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-users-delete", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const payload = await request.json();
  const parsed = deleteUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await deleteUser(parsed.data.id);
  await logAdminActivity({
    action: "USER_DELETED",
    targetType: "USER",
    targetId: parsed.data.id,
    summary: `Xóa người dùng ID ${parsed.data.id}`,
  });
  return NextResponse.json({ ok: true });
}
