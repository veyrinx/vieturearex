import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/lib/types/database";
import { hasSupabaseEnv, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

type SupabaseServerClient = ReturnType<typeof createServerClient<Database, "public">>;

// Cross-origin clients (Zalo/Telegram Mini App webview) can't send our auth
// cookies, so they authenticate with `Authorization: Bearer <supabase jwt>`.
// Read that token from the incoming request when present.
async function getBearerToken(): Promise<string | null> {
  try {
    const auth = (await headers()).get("authorization");
    if (!auth) return null;
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    const token = m?.[1]?.trim() ?? null;
    // Ignore the anon/publishable key if it is (incorrectly) sent as a bearer.
    if (!token || token === supabaseAnonKey) return null;
    return token;
  } catch {
    // headers() throws outside a request scope (e.g. build) — treat as no token.
    return null;
  }
}

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

  const client = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
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
      // Inject the mini-app user's bearer token onto outgoing Supabase requests
      // (Auth + PostgREST) so RLS runs as that user when there's no cookie session.
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = await getBearerToken();
        if (token) {
          const h = new Headers(init?.headers);
          h.set("Authorization", `Bearer ${token}`);
          init = { ...init, headers: h };
        }
        return fetchWithRetry(input, init);
      }) as typeof fetch,
    },
  });

  // Transparently resolve the mini-app user from the bearer token. Cookie-based
  // callers pass no Authorization header, so their behaviour is unchanged.
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async (jwt?: string) => {
    if (jwt) return originalGetUser(jwt);
    const token = await getBearerToken();
    return token ? originalGetUser(token) : originalGetUser();
  }) as typeof client.auth.getUser;

  return client;
}
