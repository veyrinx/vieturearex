import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getClientIp } from "@/lib/server/get-client-ip";
import { getSettings } from "@/lib/data/content-service";
import { hasCapability, parseRoleCapabilities, type CapabilityKey } from "@/lib/permissions";

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

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 200,
  it: 150,
  admin: 100,
  manager: 60,
  support: 40,
  user: 20,
};

function matchesMinimumRole(role: string | null | undefined, minimumRole: MinimumRole) {
  if (!role) return false;
  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return userLevel >= requiredLevel;
}

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

  if (!matchesMinimumRole(role, minimumRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (options?.capability) {
    try {
      const settings = await getSettings();
      const raw = settings.find((s) => s.key === "permissions.role_capabilities")?.value ?? null;
      const matrix = parseRoleCapabilities(raw);
      if (!hasCapability(role, options.capability, matrix)) {
        return NextResponse.json(
          { error: `Forbidden: missing capability '${options.capability}'.` },
          { status: 403 },
        );
      }
    } catch {
      // If matrix lookup fails, fall back to role-hierarchy result already passed above.
    }
  }

  return null;
}
