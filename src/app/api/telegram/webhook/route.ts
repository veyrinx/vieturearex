import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSettings, getNews, getEvents } from "@/lib/data/content-service";
import { getGlobalPlayerLeaderboard } from "@/lib/tms/data";
import { untypedFrom } from "@/lib/supabase/untyped";
import { performCheckin } from "@/lib/server/checkin";
import { sanitizePlainText } from "@/lib/server/sanitize";
import { siteConfig } from "@/lib/constants/site";
import { subscribeUser, unsubscribeUser } from "@/lib/server/telegram-broadcast";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getPrimeStoreLive } from "@/lib/server/prime-store-live";
import { DEFAULT_PRIME_SERVER } from "@/lib/constants/prime-store-live";
import { generateAiReply, isAiReplyEnabled } from "@/lib/server/ai-support";

const TOKEN_KEY = "integrations.telegram_bot_token";
const CHAT_KEY  = "integrations.telegram_chat_id";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Arex";
const MINI_APP_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/tg`
  : `${siteConfig.url}/tg`;

// Extracts a UUID session ID from Supabase Realtime notification text
// Notifications embed: "┗ Session: <uuid>" in HTML or plain text
function extractSessionId(text: string): string | null {
  const match = text.match(/Session[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] ?? null;
}

type ChatType = "private" | "group" | "supergroup" | "channel" | undefined;
type TelegramFrom = { id: number; first_name?: string; last_name?: string; username?: string };
type TelegramMessage = {
  from?: TelegramFrom;
  chat?: { id: number; type?: ChatType };
  text?: string;
  reply_to_message?: { text?: string; caption?: string };
};
type TelegramCallbackQuery = {
  id: string;
  from?: TelegramFrom;
  data?: string;
  message?: { chat?: { id: number; type?: ChatType } };
};
type TelegramChatMember = {
  from?: TelegramFrom;
  chat?: { id: number; type?: ChatType };
  new_chat_member?: { user?: TelegramFrom; status?: string };
};
type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  my_chat_member?: TelegramChatMember;
};

// ── Telegram API helpers ────────────────────────────────────────────────────

function tgApi(token: string, method: string, payload: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await tgApi(token, "sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true,
  });
}

async function sendTelegramMessageWithKeyboard(
  token: string,
  chatId: number,
  text: string,
  replyMarkup: object,
) {
  await tgApi(token, "sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: replyMarkup,
  });
}

async function answerCallbackQuery(token: string, id: string, text?: string, showAlert = false) {
  await tgApi(token, "answerCallbackQuery", {
    callback_query_id: id, ...(text ? { text, show_alert: showAlert } : {}),
  });
}

function e(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Nút mở Mini App: private → web_app (mở ngay trong Telegram); nhóm → link web
 *  (Telegram chỉ cho nút web_app trong chat riêng, gửi ở nhóm sẽ lỗi). */
function appBtn(text: string, path: string, webUrl: string, chatType: ChatType) {
  return chatType === "private"
    ? { text, web_app: { url: `${MINI_APP_URL}${path}` } }
    : { text, url: webUrl };
}

// ── Command / action dispatch ───────────────────────────────────────────────

type ActionCtx = {
  token: string;
  chatId: number;
  fromId?: number;
  firstName: string;
  chatType: ChatType;
};

/** user_id đã liên kết với 1 telegram_user_id, hoặc null. */
async function linkedUserId(fromId: number): Promise<string | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data } = (await untypedFrom(db, "telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", fromId)
    .maybeSingle()) as { data: { user_id: string } | null };
  return data?.user_id ?? null;
}

async function promptLink(ctx: ActionCtx, lead: string) {
  await sendTelegramMessageWithKeyboard(
    ctx.token,
    ctx.chatId,
    `${lead}\n\nCách liên kết:\n1️⃣ Đăng nhập <a href="${siteConfig.url}">web Arex</a> → trang <b>Liên kết Telegram</b> để lấy mã.\n2️⃣ Gõ <code>/lienket MÃ</code> ngay tại đây, hoặc mở Hồ sơ trong Mini App để nhập mã.`,
    { inline_keyboard: [[appBtn("🔗 Mở Hồ sơ để liên kết", "/profile", `${siteConfig.url}/lien-ket-telegram`, ctx.chatType)]] },
  );
}

async function actCheckin(ctx: ActionCtx): Promise<void> {
  if (!ctx.fromId) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Không điểm danh được lúc này, thử lại sau.");
    return;
  }
  const userId = await linkedUserId(ctx.fromId);
  if (!userId) {
    await promptLink(ctx, "🔗 Bạn chưa liên kết tài khoản Arex nên chưa điểm danh được.");
    return;
  }
  const result = await performCheckin(userId);
  if (!result) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Có lỗi khi điểm danh, thử lại sau.");
    return;
  }
  await sendTelegramMessage(
    ctx.token,
    ctx.chatId,
    result.alreadyCheckedIn
      ? `✅ Hôm nay bạn đã điểm danh rồi.\nChuỗi hiện tại: <b>${result.streak}</b> ngày 🔥`
      : `🎉 Điểm danh thành công! <b>+2 điểm</b>\nChuỗi: <b>${result.streak}</b> ngày 🔥`,
  );
}

async function actStart(ctx: ActionCtx): Promise<void> {
  await sendTelegramMessageWithKeyboard(
    ctx.token,
    ctx.chatId,
    `👋 Xin chào <b>${e(ctx.firstName)}</b>!\n\nChào mừng đến với <b>Arex</b> – cổng thông tin cộng đồng Free Fire.\n\n📰 Tin tức &amp; sự kiện in-game\n🏆 Giải đấu, BXH &amp; bình chọn\n🧠 Quiz đố vui nhận thưởng\n💎 Cửa hàng Prime &amp; điểm danh nhận điểm\n\nChọn nút bên dưới để bắt đầu:`,
    {
      inline_keyboard: [
        [appBtn("🎮 Mở Arex Mini App", "", siteConfig.url, ctx.chatType)],
        [
          appBtn("🏆 Giải đấu", "/giai-dau", `${siteConfig.url}/tournaments`, ctx.chatType),
          appBtn("🏅 BXH", "/leaderboard", `${siteConfig.url}/bxh`, ctx.chatType),
          appBtn("🧠 Quiz", "/quiz", `${siteConfig.url}/quiz`, ctx.chatType),
        ],
        [
          { text: "✅ Điểm danh", callback_data: "act:checkin" },
          { text: "👤 Hồ sơ", callback_data: "act:hoso" },
          { text: "💎 Cửa hàng", callback_data: "act:nap" },
        ],
        [{ text: "🌐 Mở trang web", url: siteConfig.url }],
      ],
    },
  );
}

async function actBxh(ctx: ActionCtx): Promise<void> {
  const players = await getGlobalPlayerLeaderboard(5).catch(() => []);
  const medals = ["🥇", "🥈", "🥉", "4.", "5."];
  const lines = ["🏅 <b>Top tuyển thủ cộng đồng</b>\n"];
  if (players.length === 0) {
    lines.push("<i>Chưa có dữ liệu xếp hạng giải đấu.</i>");
  } else {
    players.forEach((p, i) => {
      const name = p.display_name || (p.ff_id ? `FF ${p.ff_id}` : "Người chơi");
      lines.push(`${medals[i] ?? `${i + 1}.`} ${e(name)} — <b>${p.total_points.toLocaleString("vi-VN")}</b> điểm`);
    });
  }
  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId, lines.join("\n"),
    { inline_keyboard: [[appBtn("🏅 Xem đầy đủ (Tuyển thủ + Nick khủng)", "/leaderboard", `${siteConfig.url}/bxh`, ctx.chatType)]] },
  );
}

async function actQuiz(ctx: ActionCtx): Promise<void> {
  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId,
    `🧠 <b>Quiz Free Fire</b>\n\nTrả lời câu đố, kiểm tra kiến thức &amp; leo hạng:`,
    { inline_keyboard: [[appBtn("🧠 Chơi Quiz", "/quiz", `${siteConfig.url}/quiz`, ctx.chatType)]] },
  );
}

async function actGiaidau(ctx: ActionCtx): Promise<void> {
  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId,
    `🏆 <b>Giải đấu Free Fire</b>\n\nTheo dõi bracket, lịch thi đấu &amp; kết quả:`,
    {
      inline_keyboard: [
        [appBtn("🏆 Mở giải đấu", "/giai-dau", `${siteConfig.url}/tournaments`, ctx.chatType)],
        [{ text: "🌐 Xem trên web", url: `${siteConfig.url}/tournaments` }],
      ],
    },
  );
}

async function actNews(ctx: ActionCtx): Promise<void> {
  const news = await getNews("published");
  const latest = news.slice(0, 5);
  if (!latest.length) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Chưa có tin tức nào.");
    return;
  }
  const lines = ["📰 <b>Tin tức mới nhất</b>\n"];
  latest.forEach((item, i) => {
    lines.push(`${i + 1}. <a href="${siteConfig.url}/tin-tuc/${item.slug}">${e(item.title)}</a>`);
  });
  lines.push(`\n<a href="${siteConfig.url}/tin-tuc">→ Xem tất cả</a>`);
  await sendTelegramMessage(ctx.token, ctx.chatId, lines.join("\n"));
}

async function actEvents(ctx: ActionCtx): Promise<void> {
  const events = await getEvents();
  const active = events.filter((ev) => ev.status === "active" || ev.status === "upcoming").slice(0, 5);
  if (!active.length) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Hiện không có sự kiện nào đang diễn ra.");
    return;
  }
  const lines = ["📅 <b>Sự kiện Free Fire</b>\n"];
  active.forEach((ev, i) => {
    const badge = ev.status === "active" ? "🟢" : "🔵";
    lines.push(`${i + 1}. ${badge} <a href="${siteConfig.url}/su-kien/${ev.id}">${e(ev.title)}</a>`);
  });
  lines.push(`\n<a href="${siteConfig.url}/su-kien">→ Xem tất cả</a>`);
  await sendTelegramMessage(ctx.token, ctx.chatId, lines.join("\n"));
}

async function actHoso(ctx: ActionCtx): Promise<void> {
  if (!ctx.fromId) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Không xem được hồ sơ lúc này.");
    return;
  }
  const userId = await linkedUserId(ctx.fromId);
  if (!userId) {
    await promptLink(ctx, "👤 Chưa có hồ sơ nào — bạn chưa liên kết tài khoản Arex.");
    return;
  }
  const db = createAdminSupabaseClient();
  const { data: u } = (await untypedFrom(db!, "users")
    .select("display_name, points, login_streak, is_verified, role")
    .eq("id", userId)
    .maybeSingle()) as {
      data: { display_name: string | null; points: number | null; login_streak: number | null; is_verified: boolean | null; role: string | null } | null;
    };
  if (!u) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Không tìm thấy hồ sơ. Thử liên kết lại nhé.");
    return;
  }
  const verified = u.is_verified ? " ✅" : "";
  const roleLabel = u.role && u.role !== "user" ? ` · <i>${e(u.role)}</i>` : "";
  await sendTelegramMessageWithKeyboard(
    ctx.token,
    ctx.chatId,
    `👤 <b>${e(u.display_name || "Thành viên Arex")}</b>${verified}${roleLabel}\n\n` +
      `💰 Điểm: <b>${(u.points ?? 0).toLocaleString("vi-VN")}</b>\n` +
      `🔥 Chuỗi điểm danh: <b>${u.login_streak ?? 0}</b> ngày\n\n` +
      `Dùng /diemdanh mỗi ngày để giữ chuỗi &amp; cộng điểm.`,
    { inline_keyboard: [
      [{ text: "✅ Điểm danh ngay", callback_data: "act:checkin" }],
      [appBtn("🎮 Mở Hồ sơ đầy đủ", "/profile", siteConfig.url, ctx.chatType)],
    ] },
  );
}

async function actNap(ctx: ActionCtx): Promise<void> {
  const live = await getPrimeStoreLive(DEFAULT_PRIME_SERVER).catch(() => null);
  const lines = ["💎 <b>Cửa hàng Prime trong game</b> (VN)\n"];
  if (!live || live.items.length === 0) {
    lines.push("<i>Server VN chưa mở cửa hàng Prime, thử lại sau.</i>");
  } else {
    live.items.slice(0, 8).forEach((it) => {
      const name = it.label || `#${it.itemId}`;
      const tag = it.recommended ? " ⭐" : "";
      lines.push(`💠 ${e(name)}${tag} — <b>${it.gems.toLocaleString("vi-VN")}</b> 💎`);
    });
    if (live.predictions.length > 0) {
      lines.push(`\n🔮 <i>${live.predictions.length} vật phẩm dự đoán sắp về — xem trên web.</i>`);
    }
  }
  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId, lines.join("\n"),
    { inline_keyboard: [[{ text: "💎 Mở cửa hàng Prime", url: `${siteConfig.url}/cua-hang-prime` }]] },
  );
}

async function actVukhi(ctx: ActionCtx): Promise<void> {
  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId,
    `🔫 <b>Wiki vũ khí Free Fire</b>\n\nThông số, sát thương &amp; so sánh chi tiết từng khẩu:`,
    { inline_keyboard: [[{ text: "🔫 Mở Wiki vũ khí", url: `${siteConfig.url}/vu-khi` }]] },
  );
}

async function actLienket(ctx: ActionCtx, arg: string): Promise<void> {
  if (!ctx.fromId) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Không liên kết được lúc này.");
    return;
  }
  const already = await linkedUserId(ctx.fromId);
  if (already && !arg) {
    await sendTelegramMessageWithKeyboard(
      ctx.token, ctx.chatId,
      "✅ Tài khoản này đã liên kết với Arex rồi. Dùng /hoso để xem hồ sơ.",
      { inline_keyboard: [[{ text: "👤 Xem hồ sơ", callback_data: "act:hoso" }]] },
    );
    return;
  }
  const code = arg.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) {
    await promptLink(ctx, "🔗 <b>Liên kết tài khoản Arex</b>");
    return;
  }

  const db = createAdminSupabaseClient();
  if (!db) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "Hệ thống bận, thử lại sau.");
    return;
  }
  const { data: row } = (await untypedFrom(db, "telegram_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", code)
    .maybeSingle()) as { data: { code: string; user_id: string; expires_at: string } | null };

  if (!row) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "❌ Mã không đúng hoặc đã dùng. Tạo mã mới trên web rồi thử lại.");
    return;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await untypedFrom(db, "telegram_link_codes").delete().eq("code", code);
    await sendTelegramMessage(ctx.token, ctx.chatId, "⌛ Mã đã hết hạn. Tạo mã mới trên web nhé.");
    return;
  }

  // Dọn liên kết cũ cả 2 phía để giữ ràng buộc unique, rồi tạo liên kết mới.
  await untypedFrom(db, "telegram_account_links").delete().eq("user_id", row.user_id);
  await untypedFrom(db, "telegram_account_links").delete().eq("telegram_user_id", ctx.fromId);
  const { error } = await untypedFrom(db, "telegram_account_links").insert({
    telegram_user_id: ctx.fromId,
    user_id: row.user_id,
  } as never);
  if (error) {
    await sendTelegramMessage(ctx.token, ctx.chatId, "❌ Không liên kết được, thử lại sau.");
    return;
  }
  await untypedFrom(db, "telegram_link_codes").delete().eq("user_id", row.user_id);

  await sendTelegramMessageWithKeyboard(
    ctx.token, ctx.chatId,
    "🎉 Liên kết thành công! Giờ bạn có thể /diemdanh và xem /hoso ngay trong chat.",
    { inline_keyboard: [[{ text: "✅ Điểm danh ngay", callback_data: "act:checkin" }]] },
  );
}

async function actHelp(ctx: ActionCtx): Promise<void> {
  await sendTelegramMessageWithKeyboard(
    ctx.token,
    ctx.chatId,
    `🤖 <b>Arex Bot – Danh sách lệnh</b>\n\n` +
      `/start – Mở Mini App\n` +
      `/lienket – Liên kết tài khoản Arex\n` +
      `/hoso – Hồ sơ, điểm &amp; chuỗi điểm danh\n` +
      `/diemdanh – Điểm danh nhận điểm\n` +
      `/nap – Cửa hàng Prime trong game\n` +
      `/news – Tin tức mới nhất\n` +
      `/events – Sự kiện đang diễn ra\n` +
      `/giaidau – Giải đấu &amp; bracket\n` +
      `/bxh – Bảng xếp hạng\n` +
      `/quiz – Quiz đố vui\n` +
      `/vukhi – Wiki vũ khí\n` +
      `/help – Danh sách lệnh\n\n` +
      `💬 Nhắn tự do (chat riêng) để hỏi trợ lý AI của Arex.`,
    { inline_keyboard: [
      [{ text: "✅ Điểm danh", callback_data: "act:checkin" }, { text: "🏅 BXH", callback_data: "act:bxh" }],
      [appBtn("🎮 Mở Mini App", "", siteConfig.url, ctx.chatType)],
    ] },
  );
}

/** Chạy 1 hành động theo tên chuẩn hoá. Trả false nếu tên lạ. */
async function runAction(action: string, arg: string, ctx: ActionCtx): Promise<boolean> {
  switch (action) {
    case "start": case "app":            await actStart(ctx); return true;
    case "diemdanh": case "checkin":     await actCheckin(ctx); return true;
    case "lienket": case "link":         await actLienket(ctx, arg); return true;
    case "hoso": case "profile":         await actHoso(ctx); return true;
    case "nap": case "store": case "cuahang": await actNap(ctx); return true;
    case "bxh": case "leaderboard":      await actBxh(ctx); return true;
    case "quiz":                         await actQuiz(ctx); return true;
    case "giaidau": case "tournaments":  await actGiaidau(ctx); return true;
    case "news":                         await actNews(ctx); return true;
    case "events":                       await actEvents(ctx); return true;
    case "vukhi": case "weapon":         await actVukhi(ctx); return true;
    case "help":                         await actHelp(ctx); return true;
    default: return false;
  }
}

// ── AI free-text reply (private chats only) ─────────────────────────────────

async function handleAiMessage(ctx: ActionCtx, text: string): Promise<void> {
  if (!(await isAiReplyEnabled())) return;
  void tgApi(ctx.token, "sendChatAction", { chat_id: ctx.chatId, action: "typing" });
  const result = await generateAiReply(
    [{ sender_type: "user", sender_name: ctx.firstName, content: text.slice(0, 2000) }],
    SITE_NAME,
  ).catch(() => null);
  const reply = result?.reply?.trim();
  await sendTelegramMessage(
    ctx.token,
    ctx.chatId,
    reply
      ? e(reply)
      : "Cảm ơn bạn đã nhắn! Câu hỏi đã được ghi nhận, đội ngũ Arex sẽ hỗ trợ sớm nhất 🙏",
  );
}

// ── Update handlers ─────────────────────────────────────────────────────────

async function handleCallbackQuery(token: string, cb: TelegramCallbackQuery): Promise<void> {
  await answerCallbackQuery(token, cb.id);
  const chatId = cb.message?.chat?.id;
  const data = cb.data ?? "";
  if (!chatId || !data.startsWith("act:")) return;
  const action = data.slice(4);
  const ctx: ActionCtx = {
    token,
    chatId,
    fromId: cb.from?.id,
    firstName: cb.from?.first_name ?? "bạn",
    chatType: cb.message?.chat?.type,
  };
  await runAction(action, "", ctx);
}

/** Bot bị chặn / bị kick → tự huỷ đăng ký nhận tin. */
async function handleChatMember(update: TelegramChatMember): Promise<void> {
  const status = update.new_chat_member?.status;
  const userId = update.chat?.type === "private" ? update.from?.id : undefined;
  if (!userId) return;
  if (status === "kicked" || status === "left") {
    await unsubscribeUser(userId).catch(() => null);
  }
}

// Verify webhook with Telegram challenge (unused but safe to have)
export async function GET() {
  return NextResponse.json({ ok: true });
}

// Receive Telegram updates
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-webhook", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  // Validate the shared secret Telegram sends via header
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET || "";
  if (webhookSecret) {
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (receivedSecret !== webhookSecret) {
      // Always return 200 to prevent Telegram from retrying — just silently ignore
      return NextResponse.json({ ok: true });
    }
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  const settings = await getSettings();
  const token = settings.find((s) => s.key === TOKEN_KEY)?.value ?? "";
  const adminChatId = settings.find((s) => s.key === CHAT_KEY)?.value ?? "";

  // Callback buttons (inline keyboard actions)
  if (update.callback_query) {
    if (token) await handleCallbackQuery(token, update.callback_query);
    return NextResponse.json({ ok: true });
  }

  // Bot blocked / unblocked
  if (update.my_chat_member) {
    await handleChatMember(update.my_chat_member).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  if (!update.message) return NextResponse.json({ ok: true });

  const { message } = update;
  const text = message.text?.trim();
  const chatId = message.chat?.id;
  const chatType = message.chat?.type;
  const replyTo = message.reply_to_message;
  const fromName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean).join(" ") || "Admin";

  if (!text || !chatId) return NextResponse.json({ ok: true });

  const ctx: ActionCtx = {
    token,
    chatId,
    fromId: message.from?.id,
    firstName: message.from?.first_name ?? fromName,
    chatType,
  };

  // Bot commands
  if (text.startsWith("/") && !replyTo) {
    if (token) {
      const [rawCmd, ...argParts] = text.split(/\s+/);
      const base = rawCmd.split("@")[0].slice(1).toLowerCase();
      const arg = argParts.join(" ");
      // Auto-subscribe on /start so bot can DM this user later
      if ((base === "start" || base === "app") && message.from?.id) {
        void subscribeUser(message.from.id, ctx.firstName, message.from.username).catch(() => null);
      }
      const handled = await runAction(base, arg, ctx);
      if (!handled) {
        await sendTelegramMessage(
          token, chatId,
          `🤔 Mình chưa hiểu lệnh <code>/${e(base)}</code>. Gõ /help để xem danh sách lệnh.`,
        );
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true });
  }

  // Free-text in a private chat → AI assistant reply
  if (!replyTo && chatType === "private") {
    if (token) await handleAiMessage(ctx, text).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  // Only handle when admin replies to a CSKH notification message
  const replyText = replyTo?.text ?? replyTo?.caption ?? "";
  if (!replyText) return NextResponse.json({ ok: true });

  // Must be a CSKH notification (contains "CSKH" or "Session:")
  const isCskhNotification = /CSKH|Session:/i.test(replyText);
  if (!isCskhNotification) return NextResponse.json({ ok: true });

  const sessionId = extractSessionId(replyText);
  if (!sessionId) return NextResponse.json({ ok: true });

  const db = createAdminSupabaseClient();

  // Restrict to the configured admin chat (security: only configured chat can reply)
  if (adminChatId && String(chatId) !== adminChatId) {
    return NextResponse.json({ ok: true });
  }

  if (!db) {
    if (token) await sendTelegramMessage(token, chatId, "❌ Database không khả dụng.");
    return NextResponse.json({ ok: true });
  }

  // Verify session exists and is still open
  const { data: session } = await db
    .from("support_sessions")
    .select("id, status, display_name")
    .eq("id", sessionId)
    .maybeSingle() as { data: { id: string; status: string; display_name: string } | null };

  if (!session) {
    if (token) await sendTelegramMessage(token, chatId, `❌ Không tìm thấy phiên <code>${sessionId}</code>.`);
    return NextResponse.json({ ok: true });
  }

  if (session.status !== "open") {
    if (token) await sendTelegramMessage(token, chatId, `⚠️ Phiên của <b>${session.display_name}</b> đã đóng.`);
    return NextResponse.json({ ok: true });
  }

  // Insert admin reply
  const { error } = await db
    .from("support_messages")
    .insert({
      session_id: sessionId,
      sender_type: "admin",
      sender_name: fromName,
      content: sanitizePlainText(text),
    } as never);

  if (error) {
    if (token) await sendTelegramMessage(token, chatId, "❌ Không thể gửi tin nhắn. Thử lại sau.");
    return NextResponse.json({ ok: true });
  }

  await db
    .from("support_sessions")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", sessionId);

  if (token) {
    await sendTelegramMessage(
      token,
      chatId,
      `✅ Đã gửi trả lời tới <b>${session.display_name}</b>.\n\n💬 <i>${sanitizePlainText(text).slice(0, 200)}</i>`,
    );
  }

  return NextResponse.json({ ok: true });
}
