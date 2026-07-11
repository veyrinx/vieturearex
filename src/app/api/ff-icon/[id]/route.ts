import { NextRequest } from "next/server";
import { ICON_UPSTREAM } from "@/lib/data/ff-icons";

// Proxy ảnh icon qua domain của site (cache vĩnh viễn ở CDN edge).
// Giúp link ảnh chạy theo tên miền + ổn định khi raw.githubusercontent bị chặn.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = raw.replace(/\.png$/i, "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const upstream = await fetch(`${ICON_UPSTREAM}${id}.png`, { next: { revalidate: 86400 } });
    if (!upstream.ok) return new Response("Not found", { status: 404 });
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
}
