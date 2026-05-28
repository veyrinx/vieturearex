import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/server/send-password-reset-email";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "forgot-password", limit: 3, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arexnetwork.site";

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ ok: true }); // silent — don't reveal server config
  }

  // Generate recovery link server-side (does not send any email via Supabase)
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
    },
  });

  if (error || !data?.properties?.action_link) {
    // User not found or other error — return ok to prevent email enumeration
    return NextResponse.json({ ok: true });
  }

  const resetLink = data.properties.action_link;

  // Try to send via our own SMTP
  const result = await sendPasswordResetEmail({ email, resetLink });

  if (!result.configured) {
    // SMTP not configured — fall back to Supabase's built-in email service
    if (supabaseUrl && supabaseAnonKey) {
      await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: "POST",
        headers: {
          "apikey": supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirect_to: `${siteUrl}/auth/callback?next=/auth/update-password`,
        }),
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}
