import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";

const ratingSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  name: z.string().min(2).max(80),
  stars: z.number().int().min(1).max(5),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "news-rating", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const parsed = ratingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!webAppUrl) {
    return NextResponse.json({ error: "Chưa cấu hình Google Apps Script URL." }, { status: 500 });
  }

  const { slug, title, name, stars } = parsed.data;

  try {
    const body = JSON.stringify({
      time: new Date().toLocaleString("vi-VN"),
      slug,
      title,
      name,
      stars,
    });

    console.log("[rating] Sending to:", webAppUrl);
    console.log("[rating] Body:", body);

    const res = await fetch(webAppUrl, {
      method: "POST",
      redirect: "follow",
      body,
    });

    const text = await res.text().catch(() => "");
    console.log("[rating] Response status:", res.status);
    console.log("[rating] Response body:", text);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[rating] Apps Script error:", err);
    return NextResponse.json({ error: "Không thể ghi dữ liệu." }, { status: 500 });
  }
}
