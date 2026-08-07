import { createPublicKey, verify as verifySignature } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { discordEnv } from "@/lib/server/discord-api";
import {
  RESPONSE,
  handleCommand,
  handleComponent,
  handleModal,
  type Interaction,
} from "@/lib/server/discord-handlers";

/**
 * Cửa nhận mọi tương tác Discord (slash command, nút, menu, modal).
 *
 * Đặt URL này vào Discord Developer Portal → General Information →
 * "Interactions Endpoint URL": https://arexnetwork.site/api/discord/interactions
 *
 * Discord ký từng request bằng Ed25519; endpoint BẮT BUỘC phải kiểm chữ ký và
 * trả 401 khi sai, nếu không Discord từ chối lưu URL. Kiểm bằng `node:crypto`
 * thay vì thư viện ngoài — chỉ cần bọc khoá thô 32 byte vào vỏ SPKI.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vỏ SPKI của khoá công khai Ed25519 (RFC 8410) — phần đầu cố định. */
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function verifyDiscordSignature(body: string, signature: string, timestamp: string): boolean {
  const publicKey = discordEnv.publicKey;
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    });
    return verifySignature(
      null,
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";

  if (!verifyDiscordSignature(body, signature, timestamp)) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(body) as Interaction;
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  // 1 = PING: Discord gọi lúc lưu URL và thỉnh thoảng để kiểm tra endpoint sống.
  if (interaction.type === 1) {
    return NextResponse.json({ type: RESPONSE.PONG });
  }

  try {
    switch (interaction.type) {
      case 2: // APPLICATION_COMMAND
        return NextResponse.json(await handleCommand(interaction));
      case 3: // MESSAGE_COMPONENT
        return NextResponse.json(await handleComponent(interaction));
      case 5: // MODAL_SUBMIT
        return NextResponse.json(await handleModal(interaction));
      default:
        return NextResponse.json({ type: RESPONSE.PONG });
    }
  } catch (err) {
    console.error("[discord-interactions]", err);
    // Luôn trả lời được cái gì đó — im lặng thì người dùng thấy "ứng dụng
    // không phản hồi", tệ hơn nhiều so với một dòng báo lỗi.
    return NextResponse.json({
      type: RESPONSE.MESSAGE,
      data: {
        content: "Có lỗi khi xử lý lệnh này. Thử lại sau ít phút giúp mình nhé.",
        flags: 1 << 6,
      },
    });
  }
}
