import { NextRequest, NextResponse } from "next/server";
import { getActiveAdmins, markAdminActive } from "@/lib/data/content-service";
import { getAuthContext } from "@/lib/server/auth";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-active-admins",
    limit: 80,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const activeAdmins = await getActiveAdmins();
  return NextResponse.json({ activeAdmins });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-active-admins",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const auth = await getAuthContext();
  const fallbackEmail = auth.role === "admin" ? "demo@arex.tech" : "editor@arex.tech";
  const activeAdmins = await markAdminActive(auth.email ?? fallbackEmail);
  return NextResponse.json({ activeAdmins });
}
