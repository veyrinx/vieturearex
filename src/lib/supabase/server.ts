import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

type SupabaseServerClient = ReturnType<typeof createServerClient<Database, "public">>;

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

export function createServerSupabaseClient(): SupabaseServerClient | null {
  if (!hasSupabaseEnv || !supabaseAnonKey || !supabaseUrl) {
    return null;
  }

  return createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        return (await cookies()).get(name)?.value;
      },
      async set(name: string, value: string, options) {
        try { (await cookies()).set({ name, value, ...options }); } catch {}
      },
      async remove(name: string, options) {
        try { (await cookies()).set({ name, value: "", ...options }); } catch {}
      },
    },
    global: {
      fetch: fetchWithRetry as typeof fetch,
    },
  });
}
