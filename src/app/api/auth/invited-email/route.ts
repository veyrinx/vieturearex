import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeInvitedEmail,
  getInvitedEmails,
  isEmailInvited,
} from "@/lib/data/content-service";
import { enforceRateLimit } from "@/lib/server/api-guard";

const consumeSchema = z.object({
  email: z.string().email(),
});

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "auth-invited-email",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ allowed: false });
  }

  const invitedEmails = await getInvitedEmails();
  return NextResponse.json({
    allowed: isEmailInvited(email, invitedEmails),
  });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "auth-invited-email",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }

  const payload = await request.json();
  const parsed = consumeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  await consumeInvitedEmail(parsed.data.email);
  return NextResponse.json({ ok: true });
}
