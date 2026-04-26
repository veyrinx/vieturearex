import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  hasSupabaseServiceRoleEnv,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/env";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

// Retry transient network errors (Cloudflare/Supabase edge dropping the TLS
// socket: "fetch failed" / "socket closed" / undici UND_ERR_SOCKET).
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    const cause = (err as { cause?: { code?: string } })?.cause;
    const code = cause?.code ?? "";
    const transient =
      code === "UND_ERR_SOCKET" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN" ||
      (err instanceof TypeError && /fetch failed/i.test(err.message));

    if (transient && attempt < 2) {
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      return fetchWithRetry(input, init, attempt + 1);
    }
    throw err;
  }
}

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
      global: {
        fetch: fetchWithRetry as typeof fetch,
      },
    });
  }

  return adminClient;
}
