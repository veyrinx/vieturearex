import "server-only";
import OpenAI from "openai";
import { getSettings } from "@/lib/data/content-service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "admin";

export interface SupportMessage {
  sender_type: MessageRole;
  sender_name: string;
  content: string;
}

export interface AiReplyResult {
  reply: string;
  refused: boolean;
  category: string;
}

// ── Settings keys ─────────────────────────────────────────────────────────────

const AI_ENABLED_KEY = "integrations.ai_auto_reply";
const AI_PROMPT_KEY  = "integrations.ai_system_prompt";
const AI_NAME_KEY    = "integrations.ai_bot_name";
const AI_KEY_KEY     = "integrations.ai_api_key";

// ── Default system prompt ─────────────────────────────────────────────────────

const DEFAULT_SYSTEM = `Bạn là trợ lý AI của {siteName} — cổng thông tin cộng đồng Free Fire hàng đầu Việt Nam.

NHIỆM VỤ:
• Hỗ trợ mọi thắc mắc của người dùng — không giới hạn chủ đề.
• Ưu tiên hỗ trợ về website (đăng ký, đăng nhập, lỗi kỹ thuật), sự kiện Free Fire, tin tức, giải đấu (TMS), hướng dẫn tính năng, tiếp nhận góp ý.
• Ngoài ra vẫn sẵn sàng giúp bất cứ câu hỏi nào khác: kiến thức chung, giải thích, tư vấn, thậm chí code/kỹ thuật nếu người dùng cần.

NGUYÊN TẮC:
• Luôn cố gắng trả lời hữu ích, không từ chối chỉ vì câu hỏi nằm ngoài phạm vi website.
• Chỉ từ chối khi nội dung thực sự vi phạm pháp luật hoặc gây hại (vd: hack/cheat/phá hoại game, lừa đảo).

PHONG CÁCH:
• Thân thiện, tự nhiên — không dùng văn phong hành chính.
• Trả lời bằng tiếng Việt (hoặc theo ngôn ngữ người dùng dùng).
• Dùng "mình" cho tự nhiên. Trả lời gọn nhưng đủ ý; câu hỏi phức tạp thì giải thích kỹ hơn.`;

// ── Keyword fast-check ────────────────────────────────────────────────────────

const CODE_KEYWORDS = [
  "viết code", "lập trình", "viết hàm", "viết script", "fix bug", "sửa lỗi code",
  "debug", "compile", "chạy code", "source code", "thuật toán", "framework",
  "api endpoint", "database query", "sql query", "regex", "hàm python",
  "write code", "write a function", "write a script", "fix the bug",
  "implement", "code snippet", "write me a", "create a bot", "make a script",
  "python", "javascript", "typescript", "java ", " c++", " c#", "golang", "rust ",
  "html ", " css ", " php ", " ruby", " swift", "kotlin", "bash ", "shell script",
];

export function isLikelyCodeRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return CODE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Main AI reply function ────────────────────────────────────────────────────

export async function generateAiReply(
  history: SupportMessage[],
  siteName: string,
): Promise<AiReplyResult> {
  const settings = await getSettings();
  const apiKey =
    settings.find((s) => s.key === AI_KEY_KEY)?.value?.trim() ||
    process.env.OPENAI_API_KEY;
  if (!apiKey) return { reply: "", refused: false, category: "no_api_key" };

  const customPrompt = settings.find((s) => s.key === AI_PROMPT_KEY)?.value?.trim();
  const systemPrompt = (customPrompt || DEFAULT_SYSTEM).replace(/\{siteName\}/g, siteName);

  const recent = history.slice(-10);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = recent.map((m) => ({
    role: m.sender_type === "user" ? "user" : "assistant",
    content: m.content,
  }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return { reply: "", refused: false, category: "no_user_message" };
  }

  const lastUserMsg = recent.filter((m) => m.sender_type === "user").at(-1)?.content ?? "";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim() ?? "";
    const finishReason = response.choices[0]?.finish_reason;

    const refusedKeywords = ["không thể hỗ trợ", "không hỗ trợ", "nằm ngoài phạm vi", "không phải lĩnh vực", "từ chối"];
    const refused = refusedKeywords.some((kw) => reply.toLowerCase().includes(kw));

    const category = refused
      ? "refused"
      : lastUserMsg.toLowerCase().includes("sự kiện") ? "event"
      : lastUserMsg.toLowerCase().includes("giải đấu") || lastUserMsg.toLowerCase().includes("tms") ? "tournament"
      : lastUserMsg.toLowerCase().includes("đăng nhập") || lastUserMsg.toLowerCase().includes("tài khoản") ? "account"
      : finishReason === "stop" ? "general"
      : "unknown";

    return { reply, refused, category };
  } catch (err) {
    console.error("[ai-support] OpenAI error:", err);
    return { reply: "", refused: false, category: "error" };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function isAiReplyEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.find((s) => s.key === AI_ENABLED_KEY)?.value !== "false";
}

export async function getAiBotName(): Promise<string> {
  const settings = await getSettings();
  return settings.find((s) => s.key === AI_NAME_KEY)?.value?.trim() || "Trợ Lý AI";
}
