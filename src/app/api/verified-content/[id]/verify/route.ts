import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VerifiedContentService } from "@/lib/server/verified-content-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only Moderator/Admin (super_admin, admin, manager, it)
    const { data: userProfile } = await (supabase as any)
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isModerator = ["super_admin", "admin", "manager", "it"].includes(userProfile?.role || "");

    if (!isModerator) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Moderator permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const decision = body.decision;

    if (decision !== "VERIFY" && decision !== "REJECT") {
      return NextResponse.json(
        { success: false, error: "Invalid decision. Must be VERIFY or REJECT." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const result = await VerifiedContentService.reviewVerification({
      contentId: id,
      moderatorId: user.id,
      decision,
      verificationSource: body.verification_source || body.verificationSource,
      verificationNote: body.verification_note || body.verificationNote,
      expiresAt: body.verification_expires_at || body.expiresAt,
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Content successfully ${decision === "VERIFY" ? "verified" : "rejected"}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
