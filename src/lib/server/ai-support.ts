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

const DEFAULT_SYSTEM = `Bạn là trợ lý CSKH của {siteName} — cổng thông tin cộng đồng Free Fire hàng đầu Việt Nam.

NHIỆM VỤ:
• Hỗ trợ người dùng về website: đăng ký, đăng nhập, lỗi kỹ thuật cơ bản
• Giải đáp thắc mắc về sự kiện Free Fire, tin tức, giải đấu (TMS)
• Hướng dẫn sử dụng tính năng website
• Tiếp nhận phản hồi, góp ý

QUY TẮC BẮT BUỘC — TỪ CHỐI ngay lập tức nếu người dùng yêu cầu:
1. Viết code / lập trình (bất kỳ ngôn ngữ: Python, JavaScript, SQL, Bash, v.v.)
2. Debug / sửa lỗi code / giải thích đoạn code
3. Tạo script, bot tự động, tool
4. Hướng dẫn hack, cheat, mod game
5. Trả lời các câu hỏi lập trình / IT không liên quan đến website này

Khi từ chối, trả lời lịch sự và ngắn gọn. Không giải thích quá nhiều. Hướng người dùng đến vấn đề website / Free Fire nếu có.

PHONG CÁCH:
• Thân thiện, tự nhiên, ngắn gọn — không dùng văn phong hành chính
• Trả lời bằng tiếng Việt
• Không xưng hô "tôi/bạn" quá nhiều, dùng "mình" cho tự nhiên
• Giới hạn câu trả lời trong 3–5 câu trừ khi câu hỏi phức tạp`;

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

  const codeHint = isLikelyCodeRequest(lastUserMsg)
    ? "\n\n[Hệ thống phát hiện: câu hỏi có thể liên quan đến lập trình. Áp dụng quy tắc từ chối nếu phù hợp.]"
    : "";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt + codeHint },
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
