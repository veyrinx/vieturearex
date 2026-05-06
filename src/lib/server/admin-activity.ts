import { createAdminActivityLog } from "@/lib/data/content-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/server/get-client-ip";
import type { NextRequest } from "next/server";

type AdminActivityInput = {
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  actorEmail?: string | null;
  request?: NextRequest;
};

export async function resolveCurrentAdminEmail() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return "system@arex.tech";
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.trim().toLowerCase() || "unknown-admin@arex.tech";
}

async function resolveIp(request?: NextRequest): Promise<string | null> {
  if (request) return getClientIp(request) === "unknown" ? null : getClientIp(request);
  try {
    const h = await headers();
    const cf = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
    return cf || null;
  } catch { return null; }
}

export async function logAdminActivity(input: AdminActivityInput) {
  try {
    const actorEmail = input.actorEmail ?? (await resolveCurrentAdminEmail());
    const ip = await resolveIp(input.request);
    await createAdminActivityLog({
      actor_email: actorEmail,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      summary: input.summary,
      ip,
    });
  } catch (error) {
    console.warn("[admin-activity] unable to write log:", error);
  }
}
