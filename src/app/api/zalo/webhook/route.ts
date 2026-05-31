import { NextRequest, NextResponse } from "next/server";
import { ocrFromFetch } from "@/lib/server/ff-ocr";
import { enforceRateLimit } from "@/lib/server/api-guard";

const OA_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.ZALO_WEBHOOK_SECRET ?? "";

// Webhook verification
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("challenge") ?? url.searchParams.get("code");
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ ok: true });
}

type ZaloEvent = {
  event_name: string;
  sender?: { id: string };
  message?: {
    msg_id?: string;
    text?: string;
    attachments?: { type: string; payload?: { url?: string } }[];
  };
};

async function sendZaloReply(userId: string, text: string) {
  if (!OA_TOKEN) return;
  await fetch("https://openapi.zalo.me/v2.0/oa/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": OA_TOKEN,
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text },
    }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "zalo-webhook", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  // Validate secret if configured
  if (WEBHOOK_SECRET) {
    const sig = req.headers.get("x-zalo-signature") ?? "";
    if (sig !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => null)) as ZaloEvent | null;
  if (!body) return NextResponse.json({ ok: true });

  const senderId = body.sender?.id;
  if (!senderId) return NextResponse.json({ ok: true });

  const evt = body.event_name;
  const msg = body.message;

  // Handle image messages
  if ((evt === "user_send_image" || evt === "user_send_file") && msg?.attachments?.length) {
    const imageUrl = msg.attachments.find((a) => a.type === "image")?.payload?.url;
    if (!imageUrl) return NextResponse.json({ ok: true });

    await sendZaloReply(senderId, "⏳ Đang nhận dạng kết quả...");

    try {
      const result = await ocrFromFetch(imageUrl);
      if (result.players.length === 0) {
        await sendZaloReply(senderId, "❌ Không tìm thấy dữ liệu kết quả Free Fire trong ảnh này.");
      } else {
        const lines = result.players.map(
          (p, i) => `${i + 1}. ${p.name} — K:${p.kills} A:${p.assists} D:${p.deaths}`,
        );
        await sendZaloReply(
          senderId,
          `✅ Kết quả trận đấu:\n${lines.join("\n")}\n\nNộp tại: arexnetwork.site/tournaments`,
        );
      }
    } catch {
      await sendZaloReply(senderId, "❌ Nhận dạng thất bại. Vui lòng thử lại.");
    }

    return NextResponse.json({ ok: true });
  }

  // Handle text with share link
  if (evt === "user_send_text" && msg?.text) {
    const text = msg.text.trim();
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    const looksLikeShareLink = urlMatch && (
      urlMatch[0].includes("ff.garena") ||
      urlMatch[0].includes("garena") ||
      urlMatch[0].includes("freefire") ||
      /\.(jpg|jpeg|png|webp)/i.test(urlMatch[0])
    );

    if (looksLikeShareLink && urlMatch) {
      await sendZaloReply(senderId, "⏳ Đang phân tích link...");
      try {
        const result = await ocrFromFetch(urlMatch[0]);
        if (result.players.length === 0) {
          await sendZaloReply(senderId, "❌ Không tìm thấy dữ liệu kết quả trong link.");
        } else {
          const lines = result.players.map(
            (p, i) => `${i + 1}. ${p.name} — K:${p.kills} A:${p.assists} D:${p.deaths}`,
          );
          await sendZaloReply(
            senderId,
            `✅ Kết quả:\n${lines.join("\n")}\n\nNộp tại: arexnetwork.site/tournaments`,
          );
        }
      } catch {
        await sendZaloReply(senderId, "❌ Không thể phân tích link. Hãy gửi ảnh trực tiếp.");
      }
      return NextResponse.json({ ok: true });
    }

    // Help message for unknown text
    if (text === "/help" || text === "help") {
      await sendZaloReply(
        senderId,
        "📌 Arex TMS Bot\n\nGửi ảnh screenshot kết quả Free Fire để tự động nhận dạng K/A/D.\nHoặc dán link ảnh/share link vào đây.\n\nNộp kết quả tại: arexnetwork.site/tournaments",
      );
    }
  }

  return NextResponse.json({ ok: true });
}
