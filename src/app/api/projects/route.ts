import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getResolvedProjects } from "@/lib/server/projects";

// Public — danh sách dự án (đã resolve trạng thái). Admin sửa ở /admin/projects.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "projects", limit: 100, windowMs: 60_000 });
  if (limited) return limited;

  const projects = await getResolvedProjects();
  return NextResponse.json(
    { projects },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
