import { NextResponse } from "next/server";

// Health check cho Render (healthCheckPath trong render.yaml). Cố tình KHÔNG
// chạm Supabase: Supabase chậm một nhịp mà Render tưởng app chết thì nó restart,
// hỏng cả bản dự phòng. Ở đây chỉ trả lời "tiến trình Next còn sống".
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      time: new Date().toISOString(),
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      host: process.env.RENDER ? "render" : process.env.VERCEL ? "vercel" : "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
