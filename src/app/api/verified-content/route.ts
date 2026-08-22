import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VerifiedContentService } from "@/lib/server/verified-content-service";
import type { VerificationStatus } from "@/lib/types/verified-content";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as VerificationStatus | null;
    const userId = searchParams.get("userId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await VerifiedContentService.getContents({
      status: status || undefined,
      userId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Login required to create content." },
        { status: 401 }
      );
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

    const result = await VerifiedContentService.createContent({
      userId: user.id,
      title,
      contentBody,
      ipAddress,
    });

    if (result.error || !result.data) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
