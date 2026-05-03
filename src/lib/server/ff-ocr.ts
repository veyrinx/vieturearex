import Anthropic from "@anthropic-ai/sdk";

export type OcrPlayer = {
  name: string;
  kills: number;
  assists: number;
  deaths: number;
};

export type OcrResult = {
  players: OcrPlayer[];
  raw?: string;
};

const PROMPT = `This is a Free Fire (Garena) battle results screenshot. Extract all visible player statistics.
Return ONLY valid JSON, no markdown, no explanation:
{ "players": [{ "name": string, "kills": number, "assists": number, "deaths": number }] }
If this is not a scoreboard/results screen, return: { "players": [] }`;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

function parseResponse(text: string): OcrResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? "{}") as { players?: OcrPlayer[] };
    return { players: parsed.players ?? [], raw: text };
  } catch {
    return { players: [], raw: text };
  }
}

export async function ocrFromUrl(imageUrl: string): Promise<OcrResult> {
  const client = getClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  return parseResponse(text);
}

export async function ocrFromBase64(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<OcrResult> {
  const client = getClient();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  return parseResponse(text);
}

export async function ocrFromFetch(url: string): Promise<OcrResult> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType = (
    contentType.includes("png") ? "image/png"
    : contentType.includes("webp") ? "image/webp"
    : contentType.includes("gif") ? "image/gif"
    : "image/jpeg"
  ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  return ocrFromBase64(base64, mediaType);
}
