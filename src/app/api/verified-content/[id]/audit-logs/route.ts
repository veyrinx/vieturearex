import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VerifiedContentService } from "@/lib/server/verified-content-service";

export async function GET(
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

    const { data: userProfile } = await (supabase as any)
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isModerator = ["super_admin", "admin", "manager", "it"].includes(userProfile?.role || "");

    const { data: contentItem } = await (supabase as any)
      .from("contents")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!contentItem) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    if (contentItem.user_id !== user.id && !isModerator) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const logs = await VerifiedContentService.getAuditLogs(id);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
