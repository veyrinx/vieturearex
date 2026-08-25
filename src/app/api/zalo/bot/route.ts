import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getNews, getEvents } from "@/lib/data/content-service";
import { performCheckin } from "@/lib/server/checkin";
import { DEFAULT_PRIME_SERVER } from "@/lib/constants/prime-store-live";
import { siteConfig } from "@/lib/constants/site";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getGroupGreetings } from "@/lib/server/group-greeting";
import {
  ZALO_MEMBER_EVENT_HINT,
  detectZaloMemberEvent,
  getZaloBotId,
  getZaloBotToken,
  getZaloBotWebhookSecret,
  isValidZaloBotToken,
  normalizeCommand,
  normalizeZaloUpdate,
  stripBotMention,
  sendZaloBotMessage,
  sendZaloBotPhoto,
  type NormalizedUpdate,
} from "@/lib/server/zalo-bot";

/**
 * Webhook bot Zalo (bot.zapps.me).
 *
 * Zalo Bot không có nút bấm/inline keyboard nên toàn bộ điều hướng là lệnh chữ
 * + link. Người dùng cũng hiếm khi gõ "/", nên mọi lệnh đều nhận cả 3 dạng:
 * "/diemdanh", "diemdanh", "điểm danh".
 */

/**
 * OCR ảnh, AI, dữ liệu giải đấu và cửa hàng Prime nạp LƯỜI: mỗi tin nhắn chỉ
 * chạm tới một nhánh, mà nạp sẵn hết thì máy vừa nguội phải dựng cả đống mã
 * chưa chắc dùng — người gõ "help" cũng phải đợi OCR khởi động xong.
 */
const SITE = siteConfig.url;
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Arex";

type Ctx = {
  token: string;
  chatId: string;
  fromId: string;
  fromName: string;
  isGroup: boolean;
};

const say = (ctx: Ctx, text: string) => sendZaloBotMessage(ctx.token, ctx.chatId, text);

/**
 * Gửi ảnh kèm chú thích. Zalo nhận ảnh qua URL nên không phải tải về, nhưng
 * ảnh hỏng hoặc host chặn hotlink là sendPhoto trượt — lúc đó vẫn phải nhả chú
 * thích ra dạng chữ, không thì người dùng chẳng nhận được gì.
 */
async function sayPhoto(ctx: Ctx, photoUrl: string, caption: string): Promise<void> {
  if (photoUrl) {
    const sent = await sendZaloBotPhoto(ctx.token, ctx.chatId, photoUrl, caption);
    if (sent) return;
  }
  await say(ctx, caption);
}

/** Giờ VN, bỏ phần giờ khi mốc rơi đúng nửa đêm (ngày thuần). */
function vnDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const midnight =
    d.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) === "00:00:00";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(midnight ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}

/** "05/09/2026 → 20/09/2026", tự lược vế trống. */
function vnRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = vnDateTime(start);
  const b = vnDateTime(end);
  if (a && b) return `${a} → ${b}`;
  return a || b || "";
}

/** Còn bao lâu nữa mở / còn lại bao lâu — thứ người ta thật sự muốn biết. */
function countdownLabel(start: string, end: string, status: string): string {
  const now = Date.now();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const days = (ms: number) => Math.max(0, Math.ceil((ms - now) / 86_400_000));
  if (status === "upcoming" && !Number.isNaN(startMs) && startMs > now) {
    return `⏳ Còn ${days(startMs)} ngày nữa bắt đầu`;
  }
  if (!Number.isNaN(endMs) && endMs > now) return `⏰ Còn ${days(endMs)} ngày nữa kết thúc`;
  return "";
}

/** Ghi nhận chat đã nhắn bot để sau này đẩy thông báo (bắn rồi quên). */
async function rememberChat(update: NormalizedUpdate): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;
  await untypedFrom(db, "zalo_bot_chats").upsert(
    {
      chat_id: update.chatId,
      chat_type: update.isGroup ? "GROUP" : "USER",
      display_name: update.fromName,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    } as never,
    { onConflict: "chat_id" },
  );
}

// ── Liên kết tài khoản ──────────────────────────────────────────────────────

/** user_id Arex đã liên kết với id Zalo này, hoặc null. */
async function linkedUserId(zaloUserId: string): Promise<string | null> {
  if (!zaloUserId) return null;
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data } = (await untypedFrom(db, "zalo_account_links")
    .select("user_id")
    .eq("zalo_user_id", zaloUserId)
    .maybeSingle()) as { data: { user_id: string } | null };
  return data?.user_id ?? null;
}

const LINK_GUIDE =
  `🔗 Liên kết tài khoản Arex\n\n` +
  `1. Đăng nhập web rồi mở: ${SITE}/zalo-link\n` +
  `2. Bấm "Tạo mã", copy mã 6 ký tự.\n` +
  `3. Quay lại đây gõ: lienket MÃ\n\n` +
  `Ví dụ: lienket A7K2QP`;

async function actLienket(ctx: Ctx, arg: string): Promise<void> {
  if (!ctx.fromId) {
    await say(ctx, "Không liên kết được lúc này, thử lại sau.");
    return;
  }
  const code = arg.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) {
    const already = await linkedUserId(ctx.fromId);
    await say(ctx, already
      ? "✅ Tài khoản này đã liên kết với Arex rồi. Gõ \"hoso\" để xem hồ sơ."
      : LINK_GUIDE);
    return;
  }

  const db = createAdminSupabaseClient();
  if (!db) {
    await say(ctx, "Hệ thống bận, thử lại sau.");
    return;
  }

  const { data: row } = (await untypedFrom(db, "zalo_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", code)
    .maybeSingle()) as { data: { code: string; user_id: string; expires_at: string } | null };

  if (!row) {
    await say(ctx, "❌ Mã không đúng hoặc đã dùng. Tạo mã mới tại " + `${SITE}/zalo-link`);
    return;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await untypedFrom(db, "zalo_link_codes").delete().eq("code", code);
    await say(ctx, "⌛ Mã đã hết hạn (10 phút). Tạo mã mới rồi gõ lại nhé.");
    return;
  }

  // Dọn liên kết cũ cả 2 phía để giữ ràng buộc unique, rồi tạo liên kết mới.
  await untypedFrom(db, "zalo_account_links").delete().eq("user_id", row.user_id);
  await untypedFrom(db, "zalo_account_links").delete().eq("zalo_user_id", ctx.fromId);
  const { error } = await untypedFrom(db, "zalo_account_links").insert({
    zalo_user_id: ctx.fromId,
    user_id: row.user_id,
  } as never);
  if (error) {
    await say(ctx, "❌ Không liên kết được, thử lại sau.");
    return;
  }
  await untypedFrom(db, "zalo_link_codes").delete().eq("user_id", row.user_id);

  await say(ctx, "🎉 Liên kết thành công!\n\nGõ \"diemdanh\" mỗi ngày để cộng điểm, \"hoso\" để xem hồ sơ.");
}

// ── Các lệnh ────────────────────────────────────────────────────────────────

async function actStart(ctx: Ctx): Promise<void> {
  await say(ctx,
    `👋 Chào ${ctx.fromName}!\n\n` +
    `Đây là bot ${SITE_NAME} — cổng cộng đồng Free Fire.\n\n` +
    `Gõ một trong các lệnh:\n` +
    `• diemdanh — điểm danh nhận điểm\n` +
    `• hoso — điểm & chuỗi điểm danh\n` +
    `• bxh — bảng xếp hạng tuyển thủ\n` +
    `• tintuc — tin mới nhất\n` +
    `• sukien — sự kiện đang diễn ra\n` +
    `• giaidau — giải đấu & lịch thi đấu\n` +
    `• nap — cửa hàng Prime trong game\n` +
    `• vukhi — wiki vũ khí\n` +
    `• quiz — đố vui nhận thưởng\n` +
    `• lienket — nối tài khoản Arex\n` +
    `• help — xem lại danh sách này\n\n` +
    `🌐 ${SITE}`,
  );
}

async function actHelp(ctx: Ctx): Promise<void> {
  await say(ctx,
    `🤖 Bot ${SITE_NAME} — danh sách lệnh\n\n` +
    `diemdanh · hoso · bxh · tintuc · sukien · giaidau · nap · vukhi · quiz · lienket\n\n` +
    `Gõ có dấu hay không dấu, có "/" hay không đều được.\n` +
    `📸 Gửi ảnh kết quả trận Free Fire → bot tự đọc K/A/D.\n` +
    (ctx.isGroup ? "" : `💬 Nhắn tự do để hỏi trợ lý AI của ${SITE_NAME}.\n`) +
    `🌐 ${SITE}`,
  );
}

async function actCheckin(ctx: Ctx): Promise<void> {
  const userId = await linkedUserId(ctx.fromId);
  if (!userId) {
    await say(ctx, `🔗 Bạn chưa liên kết tài khoản Arex nên chưa điểm danh được.\n\n${LINK_GUIDE}`);
    return;
  }
  const result = await performCheckin(userId);
  if (!result) {
    await say(ctx, "Có lỗi khi điểm danh, thử lại sau.");
    return;
  }
  await say(ctx, result.alreadyCheckedIn
    ? `✅ Hôm nay bạn đã điểm danh rồi.\nChuỗi hiện tại: ${result.streak} ngày 🔥`
    : `🎉 Điểm danh thành công! +2 điểm\nChuỗi: ${result.streak} ngày 🔥`);
}

async function actHoso(ctx: Ctx): Promise<void> {
  const userId = await linkedUserId(ctx.fromId);
  if (!userId) {
    await say(ctx, `👤 Chưa có hồ sơ — bạn chưa liên kết tài khoản Arex.\n\n${LINK_GUIDE}`);
    return;
  }
  const db = createAdminSupabaseClient();
  if (!db) {
    await say(ctx, "Hệ thống bận, thử lại sau.");
    return;
  }
  const { data: u } = (await untypedFrom(db, "users")
    .select("display_name, points, login_streak, is_verified, role")
    .eq("id", userId)
    .maybeSingle()) as {
      data: {
        display_name: string | null;
        points: number | null;
        login_streak: number | null;
        is_verified: boolean | null;
        role: string | null;
      } | null;
    };
  if (!u) {
    await say(ctx, "Không tìm thấy hồ sơ. Thử liên kết lại nhé.");
    return;
  }
  await say(ctx,
    `👤 ${u.display_name || "Thành viên Arex"}${u.is_verified ? " ✅" : ""}` +
    `${u.role && u.role !== "user" ? ` · ${u.role}` : ""}\n\n` +
    `💰 Điểm: ${(u.points ?? 0).toLocaleString("vi-VN")}\n` +
    `🔥 Chuỗi điểm danh: ${u.login_streak ?? 0} ngày\n\n` +
    `Gõ "diemdanh" mỗi ngày để giữ chuỗi.`,
  );
}

async function actBxh(ctx: Ctx): Promise<void> {
  const { getGlobalPlayerLeaderboard } = await import("@/lib/tms/data");
  const players = await getGlobalPlayerLeaderboard(5).catch(() => []);
  const medals = ["🥇", "🥈", "🥉", "4.", "5."];
  const lines = ["🏅 Top tuyển thủ cộng đồng\n"];
  if (players.length === 0) {
    lines.push("Chưa có dữ liệu xếp hạng giải đấu.");
  } else {
    players.forEach((p, i) => {
      const name = p.display_name || (p.ff_id ? `FF ${p.ff_id}` : "Người chơi");
      lines.push(`${medals[i] ?? `${i + 1}.`} ${name} — ${p.total_points.toLocaleString("vi-VN")} điểm`);
    });
  }
  lines.push(`\n🔗 Xem đầy đủ: ${SITE}/leaderboard`);
  await say(ctx, lines.join("\n"));
}

async function actNews(ctx: Ctx): Promise<void> {
  const news = await getNews("published").catch(() => []);
  const latest = news.slice(0, 3);
  if (!latest.length) {
    await say(ctx, "Chưa có tin tức nào.");
    return;
  }
  // Gộp dòng mở đầu vào tin đầu và dòng link tổng vào tin cuối, rồi bắn SONG
  // SONG: trước đây 5 lượt gọi API nối đuôi nhau, mỗi lượt một vòng mạng nên
  // người dùng ngồi đợi mấy giây mới thấy đủ.
  await Promise.all(
    latest.map((item, i) =>
      sayPhoto(
        ctx,
        item.cover,
        [
          i === 0 ? `📰 ${latest.length} TIN MỚI NHẤT\n` : "",
          `📰 ${item.title}`,
          item.category ? `🏷️ ${item.category}` : "",
          vnDateTime(item.created_at) ? `🗓️ Đăng ${vnDateTime(item.created_at)}` : "",
          item.excerpt ? `\n${item.excerpt.slice(0, 300)}` : "",
          `\n🔗 ${SITE}/news/${item.slug}`,
          i === latest.length - 1 ? `\n📚 Tất cả tin tức: ${SITE}/news` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );
}

async function actEvents(ctx: Ctx): Promise<void> {
  const events = await getEvents().catch(() => []);
  const active = events.filter((ev) => ev.status === "active" || ev.status === "upcoming");
  if (!active.length) {
    await say(ctx, `Hiện không có sự kiện nào đang diễn ra.\n🔗 ${SITE}/events`);
    return;
  }
  const shown = active.slice(0, 3);
  // Xem ghi chú ở actNews: gộp đầu/cuối rồi bắn song song cho đỡ phải đợi.
  await Promise.all(
    shown.map((ev, i) => {
      const image = ev.image_url || ev.thumbnail_url || "";
      const caption = [
        i === 0
          ? `📅 ${active.length} SỰ KIỆN ĐANG MỞ${active.length > shown.length ? ` — hiện ${shown.length} cái gần nhất` : ""}\n`
          : "",
        ev.status === "active" ? "🟢 ĐANG DIỄN RA" : "🔵 SẮP DIỄN RA",
        `📅 ${ev.title}`,
        vnRange(ev.start_date, ev.end_date) ? `🕒 ${vnRange(ev.start_date, ev.end_date)}` : "",
        countdownLabel(ev.start_date, ev.end_date, ev.status),
        ev.server_region ? `🌐 Server ${ev.server_region}` : "",
        ev.description ? `\n${ev.description.slice(0, 300)}` : "",
        `\n🔗 ${SITE}/events/${ev.id}`,
        ev.link ? `↗️ Trang gốc: ${ev.link}` : "",
        i === shown.length - 1 ? `\n📚 Tất cả sự kiện: ${SITE}/events` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return sayPhoto(ctx, image, caption);
    }),
  );
}

async function actGiaidau(ctx: Ctx): Promise<void> {
  await say(ctx, `🏆 Giải đấu Free Fire\n\nBracket, lịch thi đấu & kết quả:\n${SITE}/tournaments`);
}

async function actQuiz(ctx: Ctx): Promise<void> {
  await say(ctx, `🧠 Quiz Free Fire\n\nTrả lời câu đố, leo hạng nhận thưởng:\n${SITE}/quiz`);
}

async function actVukhi(ctx: Ctx): Promise<void> {
  await say(ctx, `🔫 Wiki vũ khí Free Fire\n\nThông số, sát thương & so sánh:\n${SITE}/weapons`);
}

async function actNap(ctx: Ctx): Promise<void> {
  const { getPrimeStoreLive } = await import("@/lib/server/prime-store-live");
  const live = await getPrimeStoreLive(DEFAULT_PRIME_SERVER).catch(() => null);
  const lines = ["💎 Cửa hàng Prime trong game (VN)\n"];
  if (!live || live.items.length === 0) {
    lines.push("Server VN chưa mở cửa hàng Prime, thử lại sau.");
  } else {
    live.items.slice(0, 8).forEach((it) => {
      lines.push(`💠 ${it.label || `#${it.itemId}`}${it.recommended ? " ⭐" : ""} — ${it.gems.toLocaleString("vi-VN")} 💎`);
    });
  }
  lines.push(`\n🔗 ${SITE}/prime-store`);
  await say(ctx, lines.join("\n"));
}

/** Ảnh kết quả trận → OCR K/A/D. */
async function handlePhoto(ctx: Ctx, photoUrl: string): Promise<void> {
  await say(ctx, "⏳ Đang nhận dạng kết quả...");
  try {
    const { ocrFromFetch } = await import("@/lib/server/ff-ocr");
    const result = await ocrFromFetch(photoUrl);
    if (result.players.length === 0) {
      await say(ctx, "❌ Không tìm thấy dữ liệu kết quả Free Fire trong ảnh này.");
      return;
    }
    const lines = result.players.map(
      (p, i) => `${i + 1}. ${p.name} — K:${p.kills} A:${p.assists} D:${p.deaths}`,
    );
    await say(ctx, `✅ Kết quả trận đấu:\n${lines.join("\n")}\n\nNộp tại: ${SITE}/tournaments`);
  } catch {
    await say(ctx, "❌ Nhận dạng thất bại. Gửi lại ảnh rõ hơn giúp mình.");
  }
}

async function handleAi(ctx: Ctx, text: string): Promise<void> {
  const { generateAiReply, isAiReplyEnabled } = await import("@/lib/server/ai-support");
  if (!(await isAiReplyEnabled())) {
    await say(ctx, `🤔 Mình chưa hiểu. Gõ "help" để xem danh sách lệnh.`);
    return;
  }
  const result = await generateAiReply(
    [{ sender_type: "user", sender_name: ctx.fromName, content: text.slice(0, 2000) }],
    SITE_NAME,
  ).catch(() => null);

  const reply = result?.reply?.trim();
  if (reply) {
    await say(ctx, reply);
    return;
  }

  // Trợ lý hỏng thì nói thật và chỉ sang lệnh — trước đây mọi lỗi đều nuốt bằng
  // một câu cảm ơn, người dùng cứ đứng đợi hỗ trợ chẳng bao giờ tới.
  await say(ctx, aiFallbackMessage(result?.category));
}

function aiFallbackMessage(category: string | undefined): string {
  const useCommands = `Trong lúc chờ, mấy lệnh này vẫn chạy bình thường:\n` +
    `• hoso — thông tin tài khoản\n• diemdanh — điểm danh nhận điểm\n` +
    `• tintuc · sukien · bxh\n• help — xem đầy đủ`;

  switch (category) {
    case "quota_exceeded":
      return `🤖 Trợ lý AI đang hết hạn mức, tạm thời chưa trả lời tự do được.\n\n${useCommands}`;
    case "rate_limited":
      return `🤖 Trợ lý AI đang quá tải, thử lại sau vài phút nhé.\n\n${useCommands}`;
    case "bad_api_key":
    case "no_api_key":
      return `🤖 Trợ lý AI chưa được cấu hình xong.\n\n${useCommands}`;
    default:
      return `🤔 Mình chưa hiểu ý bạn.\n\n${useCommands}`;
  }
}

/** Chạy lệnh theo tên đã chuẩn hoá. false = không phải lệnh. */
async function runAction(action: string, arg: string, ctx: Ctx): Promise<boolean> {
  switch (action) {
    case "start": case "batdau": case "menu":            await actStart(ctx); return true;
    case "help": case "trogiup": case "huongdan":        await actHelp(ctx); return true;
    case "diemdanh": case "checkin":                     await actCheckin(ctx); return true;
    case "hoso": case "profile": case "taikhoan":        await actHoso(ctx); return true;
    case "lienket": case "link":                         await actLienket(ctx, arg); return true;
    case "bxh": case "xephang": case "leaderboard":      await actBxh(ctx); return true;
    case "tintuc": case "news": case "tin":              await actNews(ctx); return true;
    case "sukien": case "events": case "event":          await actEvents(ctx); return true;
    case "giaidau": case "tournaments": case "giai":     await actGiaidau(ctx); return true;
    case "quiz": case "dovui":                           await actQuiz(ctx); return true;
    case "vukhi": case "weapon": case "sung":            await actVukhi(ctx); return true;
    case "nap": case "prime": case "cuahang": case "store": await actNap(ctx); return true;
    default: return false;
  }
}

/** Chào người mới vào nhóm / tiễn người rời nhóm. */
async function handleMemberEvent(
  token: string,
  member: NonNullable<ReturnType<typeof detectZaloMemberEvent>>,
): Promise<void> {
  // Chính bot được thêm vào nhóm thì đừng tự chào mình.
  const botId = await getZaloBotId(token).catch(() => "");
  const people = member.members.filter((m) => !botId || m.id !== botId);

  // Không đọc ra người nào (Zalo giấu danh sách ở trường lạ) thì vẫn chào —
  // "{name}" lùi về "bạn". Câm hẳn mới là hỏng; chào trống còn hơn không chào.
  const names = people.map((m) => m.name).filter(Boolean).join(", ");
  const { welcome, farewell } = await getGroupGreetings(names, member.chatName);
  const text = member.kind === "join" ? welcome : farewell;
  console.log(
    `[zalo-bot] thành viên ${member.kind} chat=${member.chatId} event=${member.eventName || "?"} người=${names || "(không rõ)"} → ${text ? "gửi lời chào" : "đang tắt, bỏ qua"}`,
  );
  if (!text) return;
  await sendZaloBotMessage(token, member.chatId, text);
}

// ── Webhook ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Zalo có thể gọi GET kèm challenge khi đăng ký webhook.
  const challenge = new URL(req.url).searchParams.get("challenge");
  if (challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const limited = enforceRateLimit(req, { name: "zalo-bot-webhook", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  // Đọc thân tin TRƯỚC khi kiểm secret: nhiều nền tảng xác minh webhook bằng
  // một chuỗi challenge và đòi echo lại nguyên văn. Trả `{ok:true}` cho lượt đó
  // là xác minh trượt dù endpoint vẫn 200.
  const raw = await req.json().catch(() => null);
  const challenge =
    raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>).challenge ?? (raw as Record<string, unknown>).hub_challenge)
      : null;
  if (typeof challenge === "string" && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Secret và token đọc SONG SONG: hai thứ không liên quan nhau, nối đuôi là
  // cộng thêm một vòng chờ vào mọi tin nhắn.
  const [secretInitial, token] = await Promise.all([getZaloBotWebhookSecret(), getZaloBotToken()]);
  let secret = secretInitial;
  if (secret) {
    const received =
      req.headers.get("x-bot-api-secret-token") ??
      req.headers.get("x-zalo-bot-api-secret-token") ??
      req.headers.get("x-zalo-signature") ??
      "";
    // Lệch thì đọc lại thẳng DB rồi mới kết luận: có thể admin vừa đăng ký lại
    // với secret mới mà máy này còn giữ bản nhớ cũ.
    if (received && received !== secret) secret = await getZaloBotWebhookSecret(true);
    // Luôn trả 200 để Zalo khỏi gửi lại liên tục, nhưng phải ghi log.
    if (received !== secret) {
      console.warn("[zalo-bot] BỎ QUA update: secret không khớp.", received ? "Header có secret nhưng khác — bấm Set Webhook trong Admin để đăng ký lại đúng secret." : "Webhook đăng ký không kèm secret_token — đăng ký lại bằng nút Set Webhook trong Admin.");
      return NextResponse.json({ ok: true });
    }
  }

  // Lượt site tự gọi mình để chẩn đoán (nút Set Webhook). Đặt SAU vòng kiểm
  // secret là có thêm một tín hiệu: thấy `self_check: true` nghĩa là secret cũng
  // khớp; chỉ thấy `{ok:true}` trơ trọi là secret lệch.
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).event_name === "webhook_selfcheck") {
    return NextResponse.json({ ok: true, self_check: true });
  }

  if (!token) {
    console.warn("[zalo-bot] Có update nhưng CHƯA CẤU HÌNH TOKEN — lưu token ở Admin hoặc đặt ZALO_BOT_TOKEN.");
    return NextResponse.json({ ok: true });
  }
  // Token sai dạng: mọi lệnh gọi API sau đó chỉ nhận "Not Found" của Zalo,
  // bot nhận được tin nhưng không trả lời nổi câu nào.
  if (!isValidZaloBotToken(token)) {
    console.warn("[zalo-bot] Có update nhưng TOKEN SAI DẠNG — phải là <số>:<chuỗi>, dán lại từ bot.zapps.me.");
    return NextResponse.json({ ok: true });
  }

  // Có người vào/rời nhóm: sự kiện này không mang text nên phải bắt trước khi
  // đưa vào luồng chuẩn hoá tin nhắn.
  const member = detectZaloMemberEvent(raw);
  if (member) {
    await handleMemberEvent(token, member).catch((err) =>
      console.error("[zalo-bot] chào/tiễn thành viên lỗi:", err),
    );
    return NextResponse.json({ ok: true });
  }

  const update: NormalizedUpdate | null = normalizeZaloUpdate(raw);
  if (!update) {
    // Không đọc ra chat id = dạng payload lạ. In ra để còn biết Zalo gửi gì.
    console.warn("[zalo-bot] Không đọc được update:", JSON.stringify(raw)?.slice(0, 600));
    return NextResponse.json({ ok: true });
  }

  // Nghe như sự kiện thành viên mà detect ở trên không nhận: in NGUYÊN payload.
  // Đây là thứ duy nhất cho biết Zalo đặt danh sách người ra/vào ở trường nào,
  // và không có nó thì mỗi lần bot im lại phải ngồi đoán.
  if (ZALO_MEMBER_EVENT_HINT.test(update.eventName)) {
    console.warn(
      `[zalo-bot] Sự kiện "${update.eventName}" nghe như có người ra/vào nhóm nhưng không bắt được:`,
      JSON.stringify(raw)?.slice(0, 1200),
    );
  }

  // Bỏ qua chính tin bot vừa gửi (tránh vòng lặp tự trả lời).
  if (/sent|delivered|seen/i.test(update.eventName)) return NextResponse.json({ ok: true });

  console.log(
    `[zalo-bot] update ${update.eventName || "?"} chat=${update.chatId} text=${JSON.stringify(update.text.slice(0, 80))} (chuẩn bị ${Date.now() - startedAt}ms)`,
  );

  const ctx: Ctx = {
    token,
    chatId: update.chatId,
    fromId: update.fromId,
    fromName: update.fromName,
    isGroup: update.isGroup,
  };

  void rememberChat(update).catch(() => null);

  try {
    if (update.photoUrl) {
      await handlePhoto(ctx, update.photoUrl);
      return NextResponse.json({ ok: true });
    }

    const text = update.text;
    if (!text) return NextResponse.json({ ok: true });

    const isSlash = stripBotMention(text).startsWith("/");

    // Lệnh 2 chữ trước ("diem danh"), rồi mới tới 1 chữ ("bxh").
    const dispatch = async (candidate: string) => {
      const { one, two, argAfterOne, argAfterTwo } = normalizeCommand(candidate);
      if (await runAction(two, argAfterTwo, ctx)) return true;
      return runAction(one, argAfterOne, ctx);
    };

    if (await dispatch(text)) return NextResponse.json({ ok: true });

    // Nhắc tên bot trong nhóm: Zalo chèn cả tên hiển thị có dấu cách vào đầu tin
    // ("@Bot VieTure Hub hoso") nên cắt gọn bằng regex là thua. Bỏ dần từng chữ
    // ở đầu rồi thử lại — runAction không đụng gì khi lệnh không khớp nên thử
    // hụt vô hại. Nhờ vậy "/hoso" chạy dù có @bot hay không.
    if (text.trimStart().startsWith("@")) {
      const words = text.trim().split(/\s+/);
      for (let i = 1; i < Math.min(words.length, 6); i++) {
        if (await dispatch(words.slice(i).join(" "))) return NextResponse.json({ ok: true });
      }
    }

    // Trong nhóm: im lặng với chữ lạ, chỉ báo khi gõ hẳn "/lệnh".
    if (update.isGroup) {
      if (isSlash) await say(ctx, `🤔 Không có lệnh này. Gõ "help" để xem danh sách.`);
      return NextResponse.json({ ok: true });
    }

    // Bỏ phần nhắc tên bot trước khi đưa cho AI, không thì câu hỏi nào cũng
    // dính "@Bot VieTure Hub" ở đầu.
    await handleAi(ctx, stripBotMention(text) || text);
  } catch (err) {
    console.error("[zalo-bot] xử lý update lỗi:", err);
  } finally {
    // Chậm ở đâu thì cứ nhìn số này: tách được "site nghĩ lâu" với "Zalo giao
    // tin trễ", khỏi đoán mò.
    console.log(`[zalo-bot] xong sau ${Date.now() - startedAt}ms`);
  }

  return NextResponse.json({ ok: true });
}
