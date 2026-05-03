import {
  Client,
  GatewayIntentBits,
  Message,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_TARGET_CHANNEL_ID;
const SITE_API = process.env.AREX_SITE_URL ?? "https://arexnetwork.site";
const BOT_SECRET = process.env.BOT_API_SECRET ?? "";

if (!TOKEN) {
  console.error("DISCORD_TOKEN not set");
  process.exit(1);
}

type OcrPlayer = { name: string; kills: number; assists: number; deaths: number };
type OcrResult = { players: OcrPlayer[]; error?: string };

async function callOcr(payload: object): Promise<OcrResult> {
  const res = await fetch(`${SITE_API}/api/tms/parse-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": BOT_SECRET,
    },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as OcrResult;
}

async function handleImageOcr(msg: Message, imageUrl: string) {
  const thinking = await msg.reply("⏳ Đang nhận dạng kết quả...");
  try {
    const result = await callOcr({ fetch_url: imageUrl });

    if (result.error || !result.players || result.players.length === 0) {
      await thinking.edit("❌ Không tìm thấy dữ liệu kết quả Free Fire trong ảnh.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Kết quả Free Fire")
      .setColor(0xf59e0b)
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Arex Bot ready — logged in as ${c.user.tag}`);
  if (CHANNEL_ID) console.log(`Monitoring channel: ${CHANNEL_ID}`);
  else console.log("No DISCORD_TARGET_CHANNEL_ID set — monitoring ALL channels");
});

client.on(Events.MessageCreate, async (msg: Message) => {
  if (msg.author.bot) return;
  if (CHANNEL_ID && msg.channelId !== CHANNEL_ID) return;

  // Check for image attachments
  const imageAttachment = msg.attachments.find((a) =>
    a.contentType?.startsWith("image/") ?? /\.(jpg|jpeg|png|webp|gif)$/i.test(a.url),
  );
  if (imageAttachment) {
    await handleImageOcr(msg, imageAttachment.url);
    return;
  }

  // Check for image URLs in message content
  const urlMatch = msg.content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
  if (urlMatch) {
    await handleImageOcr(msg, urlMatch[0]);
    return;
  }

  // Bot prefix commands
  const content = msg.content.trim();
  if (content === "!ff help" || content === "!arex help") {
    await msg.reply(
      "📌 **Arex TMS Bot**\n\nGửi ảnh screenshot kết quả Free Fire — bot sẽ tự động đọc K/A/D.\nHoặc dán link ảnh trực tiếp vào chat.\n\nNộp kết quả: <" + SITE_API + "/tournaments>",
    );
  }
});

void client.login(TOKEN);
