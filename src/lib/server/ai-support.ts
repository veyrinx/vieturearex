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
// Provider linh hoạt: cắm được OpenAI / Groq / Google Gemini… (đều OpenAI-compatible)
const AI_BASE_URL_KEY = "integrations.ai_base_url";
const AI_MODEL_KEY    = "integrations.ai_model";

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

  // Base URL + model tuỳ chọn → dùng provider free (Groq/Gemini) mà không đổi code.
  const baseURL = settings.find((s) => s.key === AI_BASE_URL_KEY)?.value?.trim() || undefined;
  const model = settings.find((s) => s.key === AI_MODEL_KEY)?.value?.trim() || "gpt-4o-mini";

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
    // maxRetries mặc định của SDK là 2: gặp 429 vì hết hạn mức thì thử lại chẳng
    // bao giờ cứu được, chỉ khiến bot ngồi im thêm mấy giây rồi vẫn trả lời hụt.
    // Một lần thử lại là đủ cho 429 thoáng qua, quá đó thì chịu thua cho nhanh.
    const client = new OpenAI({ apiKey, baseURL, maxRetries: 1, timeout: 20_000 });
    const response = await client.chat.completions.create({
      model,
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
    // Surface the real cause in logs (bad/expired key, quota, wrong model, etc.)
    const e = (err ?? {}) as { status?: number; code?: string; message?: string };
    const detail = `${e.status ?? ""} ${e.message ?? String(err)}`.trim();
    const blob = `${e.code ?? ""} ${e.message ?? ""}`.toLowerCase();

    // 429 gộp hai chuyện khác hẳn nhau: gọi quá dày (chờ chút là xong) và hết
    // hạn mức/hết tiền (chờ bao lâu cũng vô ích). Gộp làm một là cứ tưởng bot
    // hỏng, trong khi việc phải làm là nạp tiền hoặc đổi key.
    if (e.status === 429) {
      const outOfQuota = /quota|billing|credit|exceeded your current/.test(blob);
      console.error(
        outOfQuota
          ? "[ai-support] HẾT HẠN MỨC OpenAI — nạp tiền hoặc đổi key ở Admin → Tích hợp → AI. Chi tiết:"
          : "[ai-support] Bị chặn vì gọi quá dày (429) — thử lại sau ít phút. Chi tiết:",
        detail,
      );
      return { reply: "", refused: false, category: outOfQuota ? "quota_exceeded" : "rate_limited" };
    }

    if (e.status === 401 || e.status === 403) {
      console.error("[ai-support] Key AI sai hoặc bị từ chối — kiểm tra lại ở Admin → Tích hợp → AI. Chi tiết:", detail);
      return { reply: "", refused: false, category: "bad_api_key" };
    }

    console.error("[ai-support] OpenAI error:", detail);
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
