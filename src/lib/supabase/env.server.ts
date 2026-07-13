import "server-only";

import { disableSupabaseRuntime, supabaseUrl } from "@/lib/supabase/env";

const _serviceRoleRaw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
// Reject placeholder values left from env templates
export const supabaseServiceRoleKey =
  _serviceRoleRaw && !_serviceRoleRaw.startsWith("YOUR_") && _serviceRoleRaw !== "your-service-role-key"
    ? _serviceRoleRaw
    : undefined;

export const hasSupabaseServiceRoleEnv = Boolean(!disableSupabaseRuntime && supabaseUrl && supabaseServiceRoleKey);
