import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAllIconIds } from "@/lib/data/ff-icons";

// Danh sách toàn bộ icon (~33k) từ repo GitHub ShahGCreator/icon (raw).
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-index", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const ids = await getAllIconIds();
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Không lấy được danh sách từ GitHub", details: [{ endpoint: "GitHub tree API", error: "Trả về rỗng" }] },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ids,
    cached: true,
    count: ids.length,
    source: "GitHub raw",
  });
}
