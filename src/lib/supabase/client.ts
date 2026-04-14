"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient<Database, "public">> | null = null;

export function createClient() {
  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database, "public">(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
