import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  addThreadMember,
  archiveThread,
  createPrivateThread,
  discordIds,
  editChannelMessage,
  sendChannelMessage,
} from "@/lib/server/discord-api";
import {
  BRAND,
  EPHEMERAL,
  SITE_URL,
  button,
  discordTime,
  embed,
  linkButton,
  progressBar,
  row,
  selectMenu,
  textInput,
  vnd,
  type Component,
  type Embed,
  type MessagePayload,
} from "@/lib/server/discord-ui";
import {
  getLinkByDiscordId,
  redeemLinkCode,
  syncDiscordRoles,
  unlinkDiscord,
} from "@/lib/server/discord-link";
import {
  getListing,
  getOrderByCode,
  getSellerByUser,
  listListings,
  listOrders,
  partyForOrder,
} from "@/lib/server/shop";
import {
  ORDER_STATUS_HINT,
  ORDER_STATUS_LABEL,
  discountPercent,
  effectivePrice,
  isSaleLive,
} from "@/lib/constants/shop";

/**
 * Xử lý mọi tương tác Discord: slash command, nút bấm, menu, modal.
 *
 * Tất cả trả lời trong 3 giây nên mọi truy vấn ở đây đều phải nhẹ — không vòng
 * lặp gọi API, không tải ảnh. Việc nặng (đăng tin ra kênh, gán role) thì bắn
 * đi rồi trả lời ngay, không chờ.
 *
 * Riêng tư: lệnh nào chạm dữ liệu cá nhân đều trả lời dạng ephemeral (chỉ
 * người gõ thấy). Kênh Discord là nơi công cộng — mã đơn, số tiền, trạng thái
 * giao dịch không được phép rơi ra giữa chat chung.
 */

// ── Kiểu dữ liệu tương tác ──────────────────────────────────────────────────
export type InteractionUser = { id: string; username?: string; global_name?: string };

export type Interaction = {
  id: string;
  type: number;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: { user: InteractionUser; roles?: string[] };
  user?: InteractionUser;
  message?: { id: string; embeds?: Embed[] };
  data?: {
    name?: string;
    custom_id?: string;
    component_type?: number;
    values?: string[];
    options?: InteractionOption[];
    components?: { components: { custom_id: string; value: string }[] }[];
  };
};

type InteractionOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: InteractionOption[];
};

export const RESPONSE = {
  PONG: 1,
  MESSAGE: 4,
  DEFERRED: 5,
  UPDATE_MESSAGE: 7,
  MODAL: 9,
} as const;

export type InteractionResponse = {
  type: number;
  data?: MessagePayload | { custom_id: string; title: string; components: Component[] };
};

function reply(payload: MessagePayload, ephemeral = true): InteractionResponse {
  return {
    type: RESPONSE.MESSAGE,
    data: { ...payload, ...(ephemeral ? { flags: EPHEMERAL } : {}) },
  };
}

function text(message: string, color: number = BRAND.gold): InteractionResponse {
  return reply({ embeds: [embed({ description: message, color })] });
}

function actorOf(i: Interaction): InteractionUser | null {
  return i.member?.user ?? i.user ?? null;
}

function optionMap(options: InteractionOption[] | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const o of options ?? []) if (o.value !== undefined) out[o.name] = o.value;
  return out;
}

/** Người gõ lệnh có phải nhân sự Arex không (theo vai trò trên site). */
async function isStaff(discordUserId: string): Promise<boolean> {
  const link = await getLinkByDiscordId(discordUserId);
  if (!link) return false;
  const client = createAdminSupabaseClient();
  if (!client) return false;
  const { data } = (await untypedFrom(client, "users")
    .select("role")
    .eq("id", link.user_id)
    .maybeSingle()) as { data: { role: string | null } | null };
  return ["super_admin", "admin", "it", "manager", "support"].includes(data?.role ?? "");
}

// ── Điều phối ───────────────────────────────────────────────────────────────
export async function handleCommand(i: Interaction): Promise<InteractionResponse> {
  const name = i.data?.name ?? "";
  const sub = i.data?.options?.find((o) => o.type === 1);
  const opts = optionMap(sub ? sub.options : i.data?.options);
  const actor = actorOf(i);
  if (!actor) return text("Không xác định được người gõ lệnh.", BRAND.red);

  switch (name) {
    case "cho":
      if (sub?.name === "tim") return shopSearch(opts);
      if (sub?.name === "tin") return shopListing(String(opts.ma ?? ""));
      if (sub?.name === "don") return shopOrder(actor, String(opts.ma ?? ""));
      return text("Lệnh con không hợp lệ.", BRAND.red);

    case "lienket":
      return linkAccount(i, actor, String(opts.ma ?? ""));

    case "huylienket":
      await unlinkDiscord(actor.id);
      return text("✅ Đã gỡ liên kết. Gõ `/lienket` với mã mới nếu muốn nối lại.", BRAND.green);

    case "toi":
      return myProfile(actor);

    case "ticket":
      return ticketPanel();

    case "sukien":
      return upcomingEvents();

    case "giveaway":
      if (sub?.name === "tao") return createGiveaway(i, actor, opts);
      if (sub?.name === "ketthuc") return closeGiveaway(actor, String(opts.ma ?? ""));
      return text("Lệnh con không hợp lệ.", BRAND.red);

    case "arex":
      return controlPanel();

    default:
      return text("Lệnh này chưa được hỗ trợ.", BRAND.red);
  }
}

export async function handleComponent(i: Interaction): Promise<InteractionResponse> {
  const id = i.data?.custom_id ?? "";
  const actor = actorOf(i);
  if (!actor) return text("Không xác định được người bấm.", BRAND.red);

  if (id === "shop:view") return shopListing(i.data?.values?.[0] ?? "");
  if (id === "ticket:topic") return ticketModal(i.data?.values?.[0] ?? "khac");
  if (id === "ticket:close") return closeTicket(i, actor);
  if (id.startsWith("giveaway:join:")) return joinGiveaway(i, actor, id.slice("giveaway:join:".length));

  return text("Nút này không còn hiệu lực.", BRAND.slate);
}

export async function handleModal(i: Interaction): Promise<InteractionResponse> {
  const id = i.data?.custom_id ?? "";
  const actor = actorOf(i);
  if (!actor) return text("Không xác định được người gửi.", BRAND.red);

  if (id.startsWith("ticket:modal:")) {
    const topic = id.slice("ticket:modal:".length);
    const fields = new Map(
      (i.data?.components ?? []).flatMap((r) => r.components.map((c) => [c.custom_id, c.value] as const)),
    );
    return openTicket(i, actor, topic, fields.get("subject") ?? "", fields.get("detail") ?? "");
  }

  return text("Biểu mẫu không hợp lệ.", BRAND.red);
}

// ── Chợ ─────────────────────────────────────────────────────────────────────
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function shopSearch(opts: Record<string, string | number | boolean>): Promise<InteractionResponse> {
  const keyword = String(opts["tu-khoa"] ?? "").trim();
  const kind = opts.loai === "account" || opts.loai === "item" ? opts.loai : undefined;
  const maxPrice = Number(opts["gia-toi-da"]) > 0 ? Number(opts["gia-toi-da"]) : undefined;

  const listings = await listListings({
    status: "active",
    search: keyword || undefined,
    kind,
    maxPrice,
    limit: 8,
  });

  if (listings.length === 0) {
    return reply({
      embeds: [
        embed({
          title: "Không tìm thấy tin nào",
          description:
            "Thử bỏ bớt điều kiện, hoặc vào chợ trên web để theo dõi bộ lọc — có tin mới khớp là bạn được báo.",
          color: BRAND.slate,
        }),
      ],
      components: [row(linkButton("Mở chợ Arex", `${SITE_URL}/shop`, "🏪"))],
    });
  }

  const lines = listings.map(
    (l, n) =>
      `**${n + 1}. [${l.title}](${SITE_URL}/shop/${l.id})**\n` +
      `${vnd(effectivePrice(l))}${isSaleLive(l) ? ` ~~${vnd(l.price)}~~ **-${discountPercent(l)}%**` : ""}` +
      `${l.negotiable ? " · thương lượng" : ""} · ${l.kind === "account" ? "Tài khoản" : "Vật phẩm"} · ` +
      `${l.seller?.display_name ?? "Người bán"}${l.seller?.rating != null ? ` ${l.seller.rating}★` : ""}`,
  );

  return reply({
    embeds: [
      embed({
        title: `🔎 ${listings.length} tin khớp tìm kiếm`,
        description: lines.join("\n\n"),
        color: BRAND.gold,
        footer: { text: "Chọn một tin bên dưới để xem chi tiết · Arex Network" },
      }),
    ],
    components: [
      selectMenu(
        "shop:view",
        "Xem chi tiết một tin…",
        listings.map((l) => ({
          label: l.title.slice(0, 90),
          value: l.id,
          description: `${vnd(effectivePrice(l))}${isSaleLive(l) ? ` (-${discountPercent(l)}%)` : ""} · ${l.seller?.display_name ?? ""}`.slice(0, 90),
          emoji: l.kind === "account" ? "🎮" : "🎁",
        })),
      ),
      row(linkButton("Mở chợ trên web", `${SITE_URL}/shop`, "🏪")),
    ],
  });
}

async function shopListing(raw: string): Promise<InteractionResponse> {
  const id = raw.match(UUID_RE)?.[0] ?? "";
  const listing = id
    ? await getListing(id)
    : (await listListings({ status: "active", search: raw.trim(), limit: 1 }))[0] ?? null;

  if (!listing) {
    return text("Không tìm thấy tin. Dán link tin từ web hoặc dùng `/cho tim` trước.", BRAND.red);
  }

  const url = `${SITE_URL}/shop/${listing.id}`;
  const details = Object.entries(listing.details ?? {}).slice(0, 8);

  return reply({
    embeds: [
      embed({
        title: listing.title,
        url,
        description: listing.description.slice(0, 600),
        color: listing.status === "active" ? BRAND.gold : BRAND.slate,
        author: { name: `🏪 ${listing.seller?.display_name ?? "Người bán Arex"}` },
        fields: [
          {
            name: "💰 Giá",
            value:
              vnd(effectivePrice(listing)) +
              (isSaleLive(listing) ? ` (giảm ${discountPercent(listing)}%, gốc ${vnd(listing.price)})` : ""),
            inline: true,
          },
          { name: "📦 Loại", value: listing.kind === "account" ? "Tài khoản" : "Vật phẩm", inline: true },
          { name: "👀 Lượt xem", value: String(listing.views), inline: true },
          ...details.map(([k, v]) => ({ name: k, value: String(v), inline: true })),
        ],
        ...(listing.images[0] ? { image: { url: listing.images[0] } } : {}),
        footer: { text: "Đặt đơn trên web để giao dịch viên giữ tiền hộ bạn" },
      }),
    ],
    components: [
      row(
        linkButton("Đặt mua an toàn", url, "🛒"),
        ...(listing.seller_id
          ? [linkButton("Gian hàng người bán", `${SITE_URL}/shop/nguoi-ban/${listing.seller_id}`, "🏬")]
          : []),
      ),
    ],
  });
}

async function shopOrder(actor: InteractionUser, code: string): Promise<InteractionResponse> {
  const link = await getLinkByDiscordId(actor.id);
  if (!link) return needLink();

  const order = await getOrderByCode(code.trim().toUpperCase());
  if (!order) return text("Không tìm thấy đơn với mã này.", BRAND.red);

  // Dùng đúng bộ luật của web: không phải người trong đơn thì coi như không có.
  const party = await partyForOrder(order, link.user_id, null);
  if (!party) return text("Không tìm thấy đơn với mã này.", BRAND.red);

  const steps = ["pending_agent", "awaiting_payment", "payment_review", "holding", "delivering", "payout", "completed"];
  const idx = steps.indexOf(order.status);

  return reply({
    embeds: [
      embed({
        title: `🧾 Đơn ${order.code}`,
        url: `${SITE_URL}/shop/don-hang/${order.code}`,
        description:
          `${progressBar(idx < 0 ? 0 : idx + 1, steps.length)}\n\n` +
          `**${ORDER_STATUS_LABEL[order.status]}** — ${ORDER_STATUS_HINT[order.status]}`,
        color: order.status === "disputed" ? BRAND.red : BRAND.blue,
        fields: [
          { name: "Món hàng", value: order.listing?.title ?? "—" },
          { name: "Số tiền", value: vnd(order.amount), inline: true },
          { name: "Vai của bạn", value: PARTY_LABEL[party] ?? party, inline: true },
          { name: "Tạo lúc", value: discordTime(order.created_at, "R"), inline: true },
        ],
      }),
    ],
    components: [row(linkButton("Mở đơn trên web", `${SITE_URL}/shop/don-hang/${order.code}`, "🔗"))],
  });
}

const PARTY_LABEL: Record<string, string> = {
  buyer: "Người mua",
  seller: "Người bán",
  agent: "Giao dịch viên",
  admin: "Quản trị viên",
};

// ── Tài khoản ───────────────────────────────────────────────────────────────
function needLink(): InteractionResponse {
  return reply({
    embeds: [
      embed({
        title: "Chưa nối tài khoản Arex",
        description:
          "Vào **arexnetwork.site → Trang cá nhân → Kết nối Discord** để lấy mã 6 ký tự, rồi gõ `/lienket <mã>` ở đây.",
        color: BRAND.gold,
      }),
    ],
    components: [row(linkButton("Lấy mã liên kết", `${SITE_URL}/profile`, "🔑"))],
  });
}

async function linkAccount(
  i: Interaction,
  actor: InteractionUser,
  code: string,
): Promise<InteractionResponse> {
  const result = await redeemLinkCode(code, actor.id, actor.username ?? actor.global_name, i.guild_id);
  if (!result.ok) return text(`❌ ${result.error}`, BRAND.red);

  // Gán role ngay; hỏng thì thôi, không chặn thông báo thành công.
  void syncDiscordRoles(result.userId, actor.id);

  return reply({
    embeds: [
      embed({
        title: "✅ Đã nối tài khoản",
        description: `Discord này giờ gắn với tài khoản **${result.displayName ?? "Arex"}**. Role trong server sẽ được cập nhật trong vài giây.`,
        color: BRAND.green,
        fields: [
          { name: "Mở khoá", value: "`/toi` · `/cho don` · thông báo đơn hàng qua tin nhắn riêng" },
        ],
      }),
    ],
    components: [row(linkButton("Trang cá nhân", `${SITE_URL}/profile`, "👤"))],
  });
}

async function myProfile(actor: InteractionUser): Promise<InteractionResponse> {
  const link = await getLinkByDiscordId(actor.id);
  if (!link) return needLink();

  const client = createAdminSupabaseClient();
  const { data: profile } = (client
    ? await untypedFrom(client, "users")
        .select("display_name, role, handle")
        .eq("id", link.user_id)
        .maybeSingle()
    : { data: null }) as { data: { display_name: string | null; role: string | null; handle: string | null } | null };

  const [seller, orders] = await Promise.all([
    getSellerByUser(link.user_id),
    listOrders({ buyerId: link.user_id, onlyActive: true, limit: 20 }),
  ]);

  return reply({
    embeds: [
      embed({
        title: `👤 ${profile?.display_name ?? "Thành viên Arex"}`,
        url: profile?.handle ? `${SITE_URL}/u/${profile.handle}` : undefined,
        color: BRAND.violet,
        fields: [
          { name: "Vai trò", value: ROLE_LABEL[profile?.role ?? "user"] ?? "Thành viên", inline: true },
          {
            name: "Gian hàng",
            value: seller
              ? seller.status === "approved"
                ? `Đã duyệt · ${seller.orders_done} đơn`
                : "Đang chờ duyệt"
              : "Chưa đăng ký",
            inline: true,
          },
          { name: "Đơn đang chạy", value: String(orders.length), inline: true },
          { name: "Nối từ", value: discordTime(link.linked_at, "R"), inline: true },
        ],
      }),
    ],
    components: [
      row(
        linkButton("Đơn của tôi", `${SITE_URL}/shop/don-hang`, "🧾"),
        linkButton("Trang cá nhân", `${SITE_URL}/profile`, "👤"),
      ),
    ],
  });
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Quản trị tối cao",
  admin: "Quản trị viên",
  it: "Kỹ thuật",
  manager: "Quản lý",
  support: "Hỗ trợ",
  team_member: "Thành viên đội",
  agent: "Giao dịch viên",
  seller: "Người bán",
  user: "Thành viên",
};

// ── Ticket hỗ trợ ───────────────────────────────────────────────────────────
const TICKET_TOPICS: { value: string; label: string; emoji: string; description: string }[] = [
  { value: "don-hang", label: "Đơn hàng trên chợ", emoji: "🧾", description: "Đơn treo, chưa nhận được acc, cần đối soát" },
  { value: "tranh-chap", label: "Tranh chấp / bị lừa", emoji: "⚠️", description: "Cần người của Arex vào xử lý gấp" },
  { value: "tai-khoan", label: "Tài khoản website", emoji: "🔐", description: "Đăng nhập, mất mật khẩu, khoá nhầm" },
  { value: "hop-tac", label: "Hợp tác / quảng cáo", emoji: "🤝", description: "Đề nghị hợp tác, tài trợ, đăng bài" },
  { value: "khac", label: "Việc khác", emoji: "💬", description: "Góp ý, báo lỗi, hỏi chung" },
];

function ticketPanel(): InteractionResponse {
  return reply({
    embeds: [
      embed({
        title: "🎫 Mở phòng hỗ trợ",
        description:
          "Chọn đúng chủ đề để đội ngũ vào nhanh. Phòng được tạo dạng **riêng tư** — chỉ bạn và nhân sự Arex đọc được.",
        color: BRAND.sky,
        fields: [
          { name: "Trước khi mở", value: "Đơn hàng thì chuẩn bị sẵn **mã đơn** (AX-…) và ảnh chụp màn hình." },
        ],
      }),
    ],
    components: [
      selectMenu("ticket:topic", "Chọn chủ đề cần hỗ trợ…", TICKET_TOPICS),
    ],
  });
}

function ticketModal(topic: string): InteractionResponse {
  const t = TICKET_TOPICS.find((x) => x.value === topic) ?? TICKET_TOPICS[TICKET_TOPICS.length - 1];
  return {
    type: RESPONSE.MODAL,
    data: {
      custom_id: `ticket:modal:${t.value}`,
      title: `Hỗ trợ · ${t.label}`.slice(0, 45),
      components: [
        textInput({
          customId: "subject",
          label: "Tóm tắt trong một dòng",
          placeholder: "VD: Đơn AX-7KQ4P2 đã chuyển tiền 2 tiếng chưa thấy giao",
          maxLength: 100,
        }),
        textInput({
          customId: "detail",
          label: "Mô tả chi tiết",
          style: "paragraph",
          placeholder: "Chuyện gì đã xảy ra, bạn đã làm gì, mong muốn xử lý thế nào…",
          maxLength: 1500,
        }),
      ],
    },
  };
}

async function openTicket(
  i: Interaction,
  actor: InteractionUser,
  topic: string,
  subject: string,
  detail: string,
): Promise<InteractionResponse> {
  const ids = await discordIds();
  const channelId = ids.ticketChannelId || i.channel_id || "";
  if (!channelId) return text("Chưa cấu hình kênh ticket, báo admin giúp nhé.", BRAND.red);

  const t = TICKET_TOPICS.find((x) => x.value === topic) ?? TICKET_TOPICS[TICKET_TOPICS.length - 1];
  const thread = await createPrivateThread(
    channelId,
    `${t.emoji} ${subject.slice(0, 60)} · ${actor.username ?? actor.id}`,
  );
  if (!thread?.id) {
    return text("Không mở được phòng hỗ trợ. Thử lại sau ít phút.", BRAND.red);
  }

  await addThreadMember(thread.id, actor.id);

  const link = await getLinkByDiscordId(actor.id);
  const client = createAdminSupabaseClient();
  if (client) {
    await untypedFrom(client, "discord_tickets").insert({
      guild_id: i.guild_id ?? null,
      channel_id: channelId,
      thread_id: thread.id,
      opener_discord_id: actor.id,
      opener_user_id: link?.user_id ?? null,
      topic: t.value,
      subject: subject.slice(0, 200),
    } as never);
  }

  await sendChannelMessage(thread.id, {
    content: ids.staffRoleId ? `<@${actor.id}> <@&${ids.staffRoleId}>` : `<@${actor.id}>`,
    allowed_mentions: {
      users: [actor.id],
      ...(ids.staffRoleId ? { roles: [ids.staffRoleId] } : {}),
    },
    embeds: [
      embed({
        title: `${t.emoji} ${subject}`,
        description: detail,
        color: BRAND.sky,
        fields: [
          { name: "Chủ đề", value: t.label, inline: true },
          { name: "Tài khoản Arex", value: link ? "Đã liên kết ✅" : "Chưa liên kết", inline: true },
        ],
        footer: { text: "Xong việc thì bấm Đóng phòng — nội dung vẫn được lưu lại" },
      }),
    ],
    components: [row(button("ticket:close", "Đóng phòng", "danger", "🔒"))],
  });

  return reply({
    embeds: [
      embed({
        title: "✅ Đã mở phòng hỗ trợ",
        description: `Vào <#${thread.id}> để trao đổi. Chỉ bạn và đội ngũ Arex thấy phòng này.`,
        color: BRAND.green,
      }),
    ],
  });
}

async function closeTicket(i: Interaction, actor: InteractionUser): Promise<InteractionResponse> {
  const threadId = i.channel_id ?? "";
  const client = createAdminSupabaseClient();
  if (!client || !threadId) return text("Không đóng được phòng này.", BRAND.red);

  const { data: ticket } = (await untypedFrom(client, "discord_tickets")
    .select("id, opener_discord_id, status")
    .eq("thread_id", threadId)
    .maybeSingle()) as { data: { id: string; opener_discord_id: string; status: string } | null };

  if (!ticket) return text("Phòng này không nằm trong hệ thống ticket.", BRAND.slate);
  if (ticket.status === "closed") return text("Phòng đã đóng từ trước.", BRAND.slate);

  // Người mở tự đóng được; ngoài ra chỉ nhân sự.
  if (ticket.opener_discord_id !== actor.id && !(await isStaff(actor.id))) {
    return text("Chỉ người mở phòng hoặc nhân sự Arex mới đóng được.", BRAND.red);
  }

  await untypedFrom(client, "discord_tickets")
    .update({ status: "closed", closed_by: actor.id, closed_at: new Date().toISOString() } as never)
    .eq("id", ticket.id);

  await sendChannelMessage(threadId, {
    embeds: [
      embed({
        title: "🔒 Phòng hỗ trợ đã đóng",
        description: `Đóng bởi <@${actor.id}>. Cần mở lại thì gõ \`/ticket\` ở kênh chung.`,
        color: BRAND.slate,
      }),
    ],
  });
  void archiveThread(threadId);

  return text("Đã đóng phòng.", BRAND.green);
}

// ── Sự kiện ─────────────────────────────────────────────────────────────────
type EventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: string;
  link: string | null;
  image_url: string | null;
};

async function upcomingEvents(): Promise<InteractionResponse> {
  const client = createAdminSupabaseClient();
  if (!client) return text("Không đọc được dữ liệu sự kiện.", BRAND.red);

  const { data } = (await untypedFrom(client, "events")
    .select("id, title, start_date, end_date, status, link, image_url")
    .in("status", ["active", "upcoming"])
    .order("start_date", { ascending: true })
    .limit(6)) as { data: EventRow[] | null };

  const rows = data ?? [];
  if (rows.length === 0) {
    return reply({
      embeds: [embed({ title: "Chưa có sự kiện nào đang mở", color: BRAND.slate })],
      components: [row(linkButton("Lịch sự kiện", `${SITE_URL}/su-kien`, "📅"))],
    });
  }

  return reply({
    embeds: [
      embed({
        title: "📅 Sự kiện Free Fire",
        color: BRAND.green,
        fields: rows.map((e) => ({
          name: `${e.status === "active" ? "🔴 Đang diễn ra" : "🟢 Sắp diễn ra"} · ${e.title}`,
          value:
            `Bắt đầu ${discordTime(e.start_date, "d")}` +
            (e.end_date ? ` → ${discordTime(e.end_date, "d")}` : "") +
            `\n[Chi tiết](${SITE_URL}/su-kien)`,
        })),
        ...(rows[0].image_url ? { thumbnail: { url: rows[0].image_url } } : {}),
      }),
    ],
    components: [row(linkButton("Xem toàn bộ lịch", `${SITE_URL}/su-kien`, "📅"))],
  });
}

// ── Giveaway ────────────────────────────────────────────────────────────────
type GiveawayRow = {
  id: string;
  channel_id: string;
  message_id: string | null;
  prize: string;
  winner_count: number;
  require_link: boolean;
  ends_at: string;
  ended: boolean;
  winners: string[];
};

function giveawayEmbed(g: GiveawayRow, entries: number): Embed {
  return embed({
    title: `🎁 GIVEAWAY · ${g.prize}`,
    description:
      `Bấm **Tham gia** để ghi tên. Kết thúc ${discordTime(g.ends_at, "R")}.` +
      (g.require_link ? "\n\n🔗 *Yêu cầu: đã liên kết tài khoản Arex (`/lienket`).*" : ""),
    color: BRAND.violet,
    fields: [
      { name: "Người trúng", value: `${g.winner_count}`, inline: true },
      { name: "Đang tham gia", value: `${entries}`, inline: true },
      { name: "Chốt lúc", value: discordTime(g.ends_at, "f"), inline: true },
    ],
    footer: { text: "Arex Network · giveaway minh bạch, bốc ngẫu nhiên" },
  });
}

async function createGiveaway(
  i: Interaction,
  actor: InteractionUser,
  opts: Record<string, string | number | boolean>,
): Promise<InteractionResponse> {
  if (!(await isStaff(actor.id))) {
    return text("Chỉ nhân sự Arex đã liên kết tài khoản mới mở được giveaway.", BRAND.red);
  }

  const client = createAdminSupabaseClient();
  const channelId = i.channel_id ?? "";
  if (!client || !channelId) return text("Không tạo được giveaway ở đây.", BRAND.red);

  const minutes = Math.min(20160, Math.max(1, Number(opts.phut) || 60)); // tối đa 14 ngày
  const endsAt = new Date(Date.now() + minutes * 60_000).toISOString();

  const { data, error } = (await untypedFrom(client, "discord_giveaways")
    .insert({
      guild_id: i.guild_id ?? null,
      channel_id: channelId,
      prize: String(opts["giai-thuong"] ?? "Phần thưởng").slice(0, 200),
      winner_count: Math.min(20, Math.max(1, Number(opts["so-nguoi"]) || 1)),
      require_link: opts["yeu-cau-lienket"] === true,
      ends_at: endsAt,
      created_by: actor.id,
    } as never)
    .select("*")
    .maybeSingle()) as { data: GiveawayRow | null; error: { message: string } | null };

  if (error || !data) return text("Không lưu được giveaway.", BRAND.red);

  const message = await sendChannelMessage(channelId, {
    embeds: [giveawayEmbed(data, 0)],
    components: [row(button(`giveaway:join:${data.id}`, "Tham gia", "success", "🎉"))],
  });

  if (message?.id) {
    await untypedFrom(client, "discord_giveaways")
      .update({ message_id: message.id } as never)
      .eq("id", data.id);
  }

  return text(`✅ Đã mở giveaway. Mã: \`${data.id}\``, BRAND.green);
}

async function joinGiveaway(
  i: Interaction,
  actor: InteractionUser,
  giveawayId: string,
): Promise<InteractionResponse> {
  const client = createAdminSupabaseClient();
  if (!client) return text("Không ghi được lượt tham gia.", BRAND.red);

  const { data: g } = (await untypedFrom(client, "discord_giveaways")
    .select("*")
    .eq("id", giveawayId)
    .maybeSingle()) as { data: GiveawayRow | null };

  if (!g) return text("Giveaway không tồn tại.", BRAND.red);
  if (g.ended || Date.parse(g.ends_at) < Date.now()) {
    return text("Giveaway đã kết thúc rồi.", BRAND.slate);
  }

  const link = await getLinkByDiscordId(actor.id);
  if (g.require_link && !link) return needLink();

  const { error } = (await untypedFrom(client, "discord_giveaway_entries").insert({
    giveaway_id: g.id,
    discord_user_id: actor.id,
    user_id: link?.user_id ?? null,
  } as never)) as { error: { message: string } | null };

  // 23505 = trùng khoá chính ⇒ đã tham gia rồi, không phải lỗi thật.
  const already = !!error && error.message.includes("duplicate");
  const { count } = (await untypedFrom(client, "discord_giveaway_entries")
    .select("discord_user_id", { count: "exact", head: true })
    .eq("giveaway_id", g.id)) as { count: number | null };

  if (g.message_id) {
    void editChannelMessage(g.channel_id, g.message_id, {
      embeds: [giveawayEmbed(g, count ?? 0)],
      components: [row(button(`giveaway:join:${g.id}`, "Tham gia", "success", "🎉"))],
    });
  }

  return text(
    already
      ? `Bạn đã ghi tên rồi. Hiện có **${count ?? 0}** người tham gia.`
      : `🎉 Đã ghi tên bạn! Hiện có **${count ?? 0}** người tham gia. Kết quả công bố ${discordTime(g.ends_at, "R")}.`,
    already ? BRAND.slate : BRAND.green,
  );
}

async function closeGiveaway(actor: InteractionUser, id: string): Promise<InteractionResponse> {
  if (!(await isStaff(actor.id))) {
    return text("Chỉ nhân sự Arex mới chốt được giveaway.", BRAND.red);
  }
  const result = await endGiveaway(id.trim());
  return text(result ? "✅ Đã chốt và công bố kết quả." : "Không chốt được giveaway này.", result ? BRAND.green : BRAND.red);
}

/**
 * Chốt một giveaway: bốc ngẫu nhiên, sửa lại tin gốc, công bố người trúng.
 * Dùng chung cho lệnh chốt sớm và cho vòng quét định kỳ ở `/api/discord/tick`.
 */
export async function endGiveaway(id: string): Promise<boolean> {
  const client = createAdminSupabaseClient();
  if (!client) return false;

  const { data: g } = (await untypedFrom(client, "discord_giveaways")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: GiveawayRow | null };
  if (!g || g.ended) return false;

  const { data: entries } = (await untypedFrom(client, "discord_giveaway_entries")
    .select("discord_user_id")
    .eq("giveaway_id", g.id)
    .limit(5000)) as { data: { discord_user_id: string }[] | null };

  const pool = (entries ?? []).map((e) => e.discord_user_id);
  // Fisher–Yates rồi cắt: mỗi người đúng một suất, không ai trúng hai lần.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const winners = pool.slice(0, g.winner_count);

  await untypedFrom(client, "discord_giveaways")
    .update({ ended: true, winners } as never)
    .eq("id", g.id);

  const announcement: MessagePayload = {
    ...(winners.length > 0
      ? { content: winners.map((w) => `<@${w}>`).join(" "), allowed_mentions: { users: winners } }
      : {}),
    embeds: [
      embed({
        title: `🎉 Kết quả giveaway · ${g.prize}`,
        description:
          winners.length > 0
            ? `Chúc mừng ${winners.map((w) => `<@${w}>`).join(", ")}!\nLiên hệ nhân sự Arex trong 48 giờ để nhận thưởng.`
            : "Không có ai tham gia — giveaway kết thúc mà không có người trúng.",
        color: winners.length > 0 ? BRAND.green : BRAND.slate,
        fields: [{ name: "Tổng lượt tham gia", value: String(pool.length), inline: true }],
      }),
    ],
  };

  await sendChannelMessage(g.channel_id, announcement);

  if (g.message_id) {
    void editChannelMessage(g.channel_id, g.message_id, {
      embeds: [
        embed({
          title: `🎁 GIVEAWAY ĐÃ KẾT THÚC · ${g.prize}`,
          description:
            winners.length > 0
              ? `Người trúng: ${winners.map((w) => `<@${w}>`).join(", ")}`
              : "Không có người tham gia.",
          color: BRAND.slate,
          fields: [{ name: "Tổng lượt tham gia", value: String(pool.length), inline: true }],
        }),
      ],
      components: [],
    });
  }

  return true;
}

// ── Bảng điều khiển ─────────────────────────────────────────────────────────
function controlPanel(): InteractionResponse {
  return reply({
    embeds: [
      embed({
        title: "⚡ Arex Network",
        description:
          "Cộng đồng Free Fire Việt Nam: chợ có trung gian giữ tiền, wiki, giải đấu, công cụ tra cứu.",
        color: BRAND.gold,
        fields: [
          { name: "🏪 Chợ", value: "`/cho tim` tìm tin · `/cho don` tra đơn", inline: true },
          { name: "👤 Tài khoản", value: "`/lienket` nối tài khoản · `/toi` xem hồ sơ", inline: true },
          { name: "🎫 Hỗ trợ", value: "`/ticket` mở phòng riêng với đội ngũ", inline: true },
          { name: "📅 Sự kiện", value: "`/sukien` lịch sự kiện đang mở", inline: true },
        ],
      }),
    ],
    components: [
      row(
        linkButton("Chợ Arex", `${SITE_URL}/shop`, "🏪"),
        linkButton("Tin tức", `${SITE_URL}/tin-tuc`, "📰"),
        linkButton("Công cụ", `${SITE_URL}/tools`, "🧰"),
      ),
      row(
        linkButton("Sự kiện", `${SITE_URL}/su-kien`, "📅"),
        linkButton("Tra cứu người chơi", `${SITE_URL}/player-lookup`, "🔎"),
        linkButton("Tải app", `${SITE_URL}/tai-app`, "📱"),
      ),
    ],
  });
}
