import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { appendUserToLarkSheet } from "@/lib/server/lark-sheet";

export async function POST(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const result = await appendUserToLarkSheet({
    email: "test@arexnetwork.site",
    display_name: "Test Account",
    role: "user",
    ff_id: "12345678",
  });

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, reason: (result as { reason?: string }).reason ?? "unknown" },
    { status: 400 },
  );
}
