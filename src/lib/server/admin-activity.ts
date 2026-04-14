import { createAdminActivityLog } from "@/lib/data/content-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AdminActivityInput = {
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  actorEmail?: string | null;
};

export async function resolveCurrentAdminEmail() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return "system@arex.tech";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email?.trim().toLowerCase() || "unknown-admin@arex.tech";
}

export async function logAdminActivity(input: AdminActivityInput) {
  try {
    const actorEmail = input.actorEmail ?? (await resolveCurrentAdminEmail());
    await createAdminActivityLog({
      actor_email: actorEmail,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      summary: input.summary,
    });
  } catch (error) {
    console.warn("[admin-activity] unable to write log:", error);
  }
}
