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
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;

    let isModerator = false;
    if (user && supabase) {
      const { data: userProfile } = await (supabase as any)
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = userProfile?.role;
      isModerator = ["super_admin", "admin", "manager", "it"].includes(role || "");
    }

    const result = await VerifiedContentService.getContentById(id, {
      id: user?.id || "",
      isModerator,
    });

    if (result.error || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      verification_details: isModerator ? result.verificationDetails : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check ownership or admin
    const { data: contentItem } = await (supabase as any)
      .from("contents")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!contentItem) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    const { data: userProfile } = await (supabase as any)
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isMod = ["super_admin", "admin", "manager", "it"].includes(userProfile?.role || "");
    if (contentItem.user_id !== user.id && !isMod) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const title = (body.title || "").trim();
    const contentBody = (body.content_body || body.contentBody || "").trim();

    if (!title || !contentBody) {
      return NextResponse.json(
        { success: false, error: "Title and content_body are required." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const result = await VerifiedContentService.updateContent({
      contentId: id,
      actorId: user.id,
      title,
      contentBody,
      ipAddress,
    });

    if (result.error || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { data: contentItem } = await (supabase as any)
      .from("contents")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!contentItem) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    const { data: userProfile } = await (supabase as any)
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isMod = ["super_admin", "admin", "manager", "it"].includes(userProfile?.role || "");
    if (contentItem.user_id !== user.id && !isMod) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const result = await VerifiedContentService.softDeleteContent({
      contentId: id,
      actorId: user.id,
      ipAddress,
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Content soft deleted successfully." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
