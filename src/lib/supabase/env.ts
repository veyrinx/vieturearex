export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const disableSupabaseRuntime = process.env.DISABLE_SUPABASE_RUNTIME === "true";

export const hasSupabaseEnv = Boolean(!disableSupabaseRuntime && supabaseUrl && supabaseAnonKey);

// Service-role env lives in "@/lib/supabase/env.server" (server-only) so the
// secret's name never reaches the client bundle.
