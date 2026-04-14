import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

type SupabaseServerClient = ReturnType<typeof createServerClient<Database, "public">>;

export function createServerSupabaseClient(): SupabaseServerClient | null {
  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Ignore error when called from Server Components
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // Ignore error when called from Server Components
        }
      },
    },
  });
}
