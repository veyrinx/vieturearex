import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getClientIp } from "@/lib/server/get-client-ip";
import { getSettings } from "@/lib/data/content-service";
import {
  persistBlock,
  recordRateLimitViolation,
  SPAM_BLOCK_DURATION_MS,
} from "@/lib/server/ip-blocker";
import {
  getResolvedRoles, getRoleLevel, hasCapabilityWithRoles, parseRoleCapabilities,
  BUILTIN_ROLE_LEVELS, type CapabilityKey,
} from "@/lib/permissions";

export function getClientKey(request: NextRequest) {
  return getClientIp(request);
}

export { getClientIp };

export function enforceRateLimit(
  request: NextRequest,
  options: {
    name: string;
    limit?: number;
    windowMs?: number;
  },
) {
  const key = `${options.name}:${getClientKey(request)}`;
  const result = rateLimit(key, {
    limit: options.limit ?? 50,
    windowMs: options.windowMs ?? 60_000,
  });

  if (!result.success) {
    // Ăn 429 một hai nhịp là người dùng thật bấm nhanh. Ăn liên tục suốt nhiều
    // phút thì là cố tình — ghi vào danh sách chặn để middleware chặn thẳng ở
    // cửa, thay vì cứ trả 429 mãi mà vẫn phải nhận từng request một.
    const spam = recordRateLimitViolation(getClientKey(request), options.name);
    if (spam) {
      void persistBlock({
        ip: getClientKey(request),
        reason: spam.reason,
        by: "auto:rate-limit",
        durationMs: SPAM_BLOCK_DURATION_MS,
      });
    }

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.retryAfter ?? 0) / 1000)),
        },
      },
    );
  }

  return null;
}

type MinimumRole = "super_admin" | "admin" | "it" | "manager" | "support" | "user";

/** Re-exported for callers that still rely on built-in levels alone. */
const ROLE_HIERARCHY = BUILTIN_ROLE_LEVELS;

export async function enforceAdminApiAuth(options?: {
  minimumRole?: MinimumRole;
  /**
   * If supplied, the caller's role MUST have this capability per the
   * permissions.role_capabilities matrix (super_admin always passes).
   * Used together with minimumRole — both checks must succeed.
   */
  capability?: CapabilityKey;
}) {
  const minimumRole = options?.minimumRole ?? "support";

  // Production: Supabase authentication is REQUIRED
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase not configured (production requires authentication)" },
      { status: 500 }
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Admin client (bypasses RLS) — preferred
  // 2. Server client (subject to RLS — needs "Users read own profile" policy)
  // 3. Last resort: app_metadata.role
  const adminClient = createAdminSupabaseClient();
  const roleClient = (adminClient ?? supabase) as typeof supabase;

  const { data: profile } = (await roleClient
    .from("users")
    .select("role, is_banned")
    .eq("id", user.id)
    .maybeSingle()) as { data: { role: string; is_banned: boolean | null } | null };

  if (profile?.is_banned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const appMetaRole = (user.app_metadata?.role as string | undefined) ?? null;
  const role = profile?.role ?? appMetaRole;

  // Resolve dynamic roles + matrix once; reused for both minimumRole and capability checks.
  let resolved: ReturnType<typeof getResolvedRoles> = [];
  let matrix = parseRoleCapabilities(null);
  try {
    const settings = await getSettings();
    const customRaw = settings.find((s) => s.key === "permissions.custom_roles")?.value ?? null;
    const matrixRaw = settings.find((s) => s.key === "permissions.role_capabilities")?.value ?? null;
    resolved = getResolvedRoles(customRaw, matrixRaw);
    matrix = parseRoleCapabilities(matrixRaw);
  } catch {
    // No DB? Fall back to built-in levels and DEFAULT_ROLE_CAPABILITIES.
  }

  // minimumRole compares against the resolved level (custom roles included).
  const builtinFallback = (BUILTIN_ROLE_LEVELS as Record<string, number>)[role ?? ""] ?? 0;
  const userLevel = getRoleLevel(role, resolved) || builtinFallback;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  if (userLevel < requiredLevel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (options?.capability) {
    if (!hasCapabilityWithRoles(role, options.capability, matrix, resolved)) {
      return NextResponse.json(
        { error: `Forbidden: missing capability '${options.capability}'.` },
        { status: 403 },
      );
    }
  }

  return null;
}
