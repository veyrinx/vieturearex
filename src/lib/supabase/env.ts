export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const _serviceRoleRaw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
// Reject placeholder values left from env templates
export const supabaseServiceRoleKey =
  _serviceRoleRaw && !_serviceRoleRaw.startsWith("YOUR_") && _serviceRoleRaw !== "your-service-role-key"
    ? _serviceRoleRaw
    : undefined;
export const disableSupabaseRuntime = process.env.DISABLE_SUPABASE_RUNTIME === "true";

export const hasSupabaseEnv = Boolean(!disableSupabaseRuntime && supabaseUrl && supabaseAnonKey);
export const hasSupabaseServiceRoleEnv = Boolean(!disableSupabaseRuntime && supabaseUrl && supabaseServiceRoleKey);
