import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
  type GuildMember,
  type TextChannel,
} from "discord.js";

/**
 * Bot gateway của Arex.
 *
 * Chia việc với endpoint `/api/discord/interactions` trên website:
 *   • Website (HTTP interactions) lo TẤT CẢ slash command, nút, menu, modal.
 *     Nó nằm cạnh database nên tra chợ/đơn/tài khoản nhanh và không lộ khoá.
 *   • Bot này (kết nối gateway 24/7) lo những thứ HTTP interactions không thấy:
 *     tin nhắn thường (OCR ảnh kết quả), thành viên mới vào server, chống spam
 *     link, và nhịp định kỳ gọi về site để chốt giveaway / nhắc sự kiện.
 *
 * Hai bên không giẫm chân nhau: Discord chỉ gửi interaction tới URL đã khai
 * báo, còn sự kiện message/member chỉ tới gateway.
 *
 * Biến môi trường:
 *   DISCORD_TOKEN              (bắt buộc)
 *   AREX_SITE_URL              mặc định https://arexnetwork.site
 *   BOT_API_SECRET             để gọi API nội bộ của site
 *   DISCORD_TARGET_CHANNEL_ID  kênh nhận ảnh kết quả (trống = mọi kênh)
 *   DISCORD_WELCOME_CHANNEL_ID kênh chào thành viên mới
 *   DISCORD_STAFF_ROLE_ID      role bỏ qua bộ lọc chống spam
 *   DISCORD_TICK_SECONDS       nhịp gọi /api/discord/tick, mặc định 60
 */

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_TARGET_CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.DISCORD_WELCOME_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.DISCORD_STAFF_ROLE_ID;
const SITE_API = process.env.AREX_SITE_URL ?? "https://arexnetwork.site";
const BOT_SECRET = process.env.BOT_API_SECRET ?? "";
const TICK_MS = Math.max(30, Number(process.env.DISCORD_TICK_SECONDS ?? 60)) * 1000;

const BRAND_GOLD = 0xf59e0b;
const BRAND_GREEN = 0x22c55e;

if (!TOKEN) {
  console.error("DISCORD_TOKEN not set");
  process.exit(1);
}

// ── Gọi API nội bộ của site ─────────────────────────────────────────────────
async function callSite<T>(path: string, payload?: object): Promise<T | null> {
  try {
    const res = await fetch(`${SITE_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": BOT_SECRET },
      ...(payload ? { body: JSON.stringify(payload) } : { body: "{}" }),
    });
    if (!res.ok) {
      console.error("[site]", path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[site]", path, err);
    return null;
  }
}

// ── OCR ảnh kết quả Free Fire ───────────────────────────────────────────────
type OcrPlayer = { name: string; kills: number; assists: number; deaths: number };
type OcrResult = { players: OcrPlayer[]; error?: string };

async function handleImageOcr(msg: Message, imageUrl: string) {
  const thinking = await msg.reply("⏳ Đang nhận dạng kết quả...");
  try {
    const result = await callSite<OcrResult>("/api/tms/parse-result", { fetch_url: imageUrl });

    if (!result || result.error || !result.players?.length) {
      await thinking.edit("❌ Không tìm thấy dữ liệu kết quả Free Fire trong ảnh.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Kết quả Free Fire")
      .setColor(BRAND_GOLD)
      .setDescription(
        result.players
          .map((p, i) => `**${i + 1}. ${p.name}** — K:\`${p.kills}\` A:\`${p.assists}\` D:\`${p.deaths}\``)
          .join("\n"),
      )
      .setFooter({ text: "Arex TMS — Nộp kết quả tại arexnetwork.site" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Nộp kết quả")
        .setURL(`${SITE_API}/tournaments`)
        .setStyle(ButtonStyle.Link),
    );

    await thinking.edit({ content: "", embeds: [embed], components: [row] });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    await thinking.edit(`❌ Lỗi nhận dạng: ${errMsg}`);
  }
}

// ── Chống spam link ─────────────────────────────────────────────────────────
/**
 * Chỉ chặn hai thứ nguy hiểm nhất với một cộng đồng game: link mời sang server
 * khác và trang "nạp kim cương miễn phí". Chửi bậy và chuyện linh tinh để
 * người thật xử lý — bot xoá nhầm còn khó chịu hơn là để lọt.
 */
const SPAM_PATTERNS: RegExp[] = [
  /discord\.(gg|com\/invite)\/\S+/i,
  /\b(free\s*(kim\s*c[uư][oơ]ng|diamond)|hack\s*kim\s*c[uư][oơ]ng|nap\s*lau|n[aạ]p\s*l[aậ]u)\b/i,
  /\b(t[aă]ng\s*follow|buff\s*(like|sub)|b[aá]n\s*acc\s*gi[aá]\s*r[eẻ])\b/i,
];

async function moderate(msg: Message): Promise<boolean> {
  if (!msg.guild) return false;
  const member = msg.member;
  if (STAFF_ROLE_ID && member?.roles.cache.has(STAFF_ROLE_ID)) return false;
  if (!SPAM_PATTERNS.some((re) => re.test(msg.content))) return false;

  // Nhóm DM không có .send() trong kiểu của discord.js; ở đây luôn là kênh
  // trong server (đã chặn !msg.guild ở trên) nhưng vẫn phải thu hẹp kiểu.
  const channel = msg.channel;
  if (!("send" in channel)) return false;

  try {
    await msg.delete();
    const warning = await channel.send(
      `<@${msg.author.id}> tin nhắn vừa rồi bị gỡ: server không cho đăng link mời hoặc quảng cáo nạp lậu. Mua bán acc thì dùng chợ có trung gian: ${SITE_API}/shop`,
    );
    // Dọn cảnh báo sau 20 giây để kênh không bị rác.
    setTimeout(() => void warning.delete().catch(() => null), 20_000);
  } catch {
    /* thiếu quyền xoá — bỏ qua */
  }
  return true;
}

// ── Chào thành viên mới + đồng bộ role ──────────────────────────────────────
async function welcome(member: GuildMember) {
  // Người đã từng liên kết tài khoản thì trả lại role ngay khi vào lại server.
  void callSite("/api/discord/sync-roles", { discordUserId: member.id });

  if (!WELCOME_CHANNEL_ID) return;
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID) as TextChannel | undefined;
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(`👋 Chào ${member.displayName} tới Arex Network!`)
    .setColor(BRAND_GREEN)
    .setDescription(
      "Cộng đồng Free Fire Việt Nam: chợ mua bán có trung gian giữ tiền, wiki, giải đấu và công cụ tra cứu.",
    )
    .addFields(
      { name: "🔗 Việc đầu tiên", value: "Gõ `/lienket` để nối tài khoản Arex và nhận role.", inline: false },
      { name: "🏪 Mua bán an toàn", value: "`/cho tim` để xem tin đang bán.", inline: true },
      { name: "🎫 Cần giúp", value: "`/ticket` mở phòng riêng với đội ngũ.", inline: true },
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: `Thành viên thứ ${member.guild.memberCount}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("Lấy mã liên kết").setURL(`${SITE_API}/discord-link`).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel("Vào chợ Arex").setURL(`${SITE_API}/shop`).setStyle(ButtonStyle.Link),
  );

  await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
}

// ── Nhịp định kỳ ────────────────────────────────────────────────────────────
/**
 * Gọi site mỗi phút để chốt giveaway tới hạn và nhắc sự kiện sắp mở.
 * Vercel Cron chỉ chạy theo ngày nên phần cần độ chính xác phút nằm ở đây.
 */
function startTicker() {
  if (!BOT_SECRET) {
    console.warn("BOT_API_SECRET chưa đặt — bỏ qua nhịp giveaway/sự kiện.");
    return;
  }
  const run = async () => {
    const res = await callSite<{ giveaways: number; events: number }>("/api/discord/tick");
    if (res && (res.giveaways > 0 || res.events > 0)) {
      console.log(`[tick] chốt ${res.giveaways} giveaway, nhắc ${res.events} sự kiện`);
    }
  };
  void run();
  setInterval(() => void run(), TICK_MS);
}

// ── Khởi động ───────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    // Cần bật "Server Members Intent" trong Developer Portal.
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Arex Bot ready — logged in as ${c.user.tag}`);
  console.log(CHANNEL_ID ? `Kênh nhận ảnh kết quả: ${CHANNEL_ID}` : "Nhận ảnh kết quả ở MỌI kênh");
  console.log(`Slash command do ${SITE_API}/api/discord/interactions xử lý`);
  startTicker();
});

client.on(Events.GuildMemberAdd, (member) => void welcome(member).catch(() => null));

client.on(Events.MessageCreate, async (msg: Message) => {
  if (msg.author.bot) return;

  if (await moderate(msg)) return;

  if (CHANNEL_ID && msg.channelId !== CHANNEL_ID) return;

  const imageAttachment = msg.attachments.find((a) =>
    a.contentType?.startsWith("image/") ?? /\.(jpg|jpeg|png|webp|gif)$/i.test(a.url),
  );
  if (imageAttachment) {
    await handleImageOcr(msg, imageAttachment.url);
    return;
  }

  const urlMatch = msg.content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
  if (urlMatch) {
    await handleImageOcr(msg, urlMatch[0]);
    return;
  }

  const content = msg.content.trim().toLowerCase();
  if (content === "!ff help" || content === "!arex help") {
    const embed = new EmbedBuilder()
      .setTitle("⚡ Bot Arex Network")
      .setColor(BRAND_GOLD)
      .setDescription("Gửi ảnh chụp bảng kết quả Free Fire, bot tự đọc K/A/D. Ngoài ra dùng slash command:")
      .addFields(
        { name: "🏪 Chợ", value: "`/cho tim` · `/cho tin` · `/cho don`", inline: true },
        { name: "👤 Tài khoản", value: "`/lienket` · `/toi`", inline: true },
        { name: "🎫 Hỗ trợ", value: "`/ticket`", inline: true },
        { name: "📅 Sự kiện", value: "`/sukien`", inline: true },
        { name: "🎁 Giveaway", value: "`/giveaway tao` (nhân sự)", inline: true },
        { name: "⚡ Tổng quan", value: "`/arex`", inline: true },
      )
      .setFooter({ text: "arexnetwork.site" });
    await msg.reply({ embeds: [embed] });
  }
});

void client.login(TOKEN);
