import { NextRequest, NextResponse } from "next/server";
import { processAiReplyForSession } from "@/lib/server/support-ai-runner";

type RouteContext = { params: Promise<{ sessionId: string }> };

// Internal endpoint kept for manual/external triggering (e.g. admin tools).
// The normal flow now calls processAiReplyForSession() directly in-process
// from the message POST, so this no longer needs to be reachable for the AI
// to reply. Still gated by an internal secret when a secret is configured.
export async function POST(request: NextRequest, { params }: RouteContext) {
  const configuredSecret = process.env.CRON_SECRET || process.env.APP_SECRET;
  if (configuredSecret) {
    const secret = request.headers.get("x-internal-secret");
    if (secret !== configuredSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { sessionId } = await params;
  const result = await processAiReplyForSession(sessionId);
  return NextResponse.json(result);
}
