import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyRedirectCookie, COOKIE_NAME } from "@/lib/server/next-token";
import { enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "pop-next", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  // Must be called by an authenticated user (just logged in)
  const supabase = createServerSupabaseClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ path: "/admin" });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";
  const path = await verifyRedirectCookie(token, "/admin");

  const res = NextResponse.json({ path });
  // Clear the one-time cookie
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
