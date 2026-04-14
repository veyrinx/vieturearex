import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  hasSupabaseServiceRoleEnv,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/env";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminSupabaseClient() {
  if (!hasSupabaseServiceRoleEnv || !supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
