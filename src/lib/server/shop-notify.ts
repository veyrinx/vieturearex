import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { createNotifications } from "@/lib/server/notifications";
import { sendPushToUsers } from "@/lib/server/push-notify";
import { discordIds, sendChannelMessage, sendDirectMessage } from "@/lib/server/discord-api";
import { getDiscordIdsForUsers } from "@/lib/server/discord-link";
import {
  BRAND,
  SITE_URL,
  embed,
  linkButton,
  row,
  vnd,
  type Embed,
  type MessagePayload,
} from "@/lib/server/discord-ui";
import {
  ORDER_STATUS_LABEL,
  ORDER_WAITING_ON,
  STALE_ORDER_HOURS,
  discountPercent,
  effectivePrice,
  hoursSince,
  isSaleLive,
  orderLastMoved,
  type OrderParty,
  type OrderStatus,
} from "@/lib/constants/shop";
import { getSellerById } from "@/lib/server/shop";
import { shopSideUserIds } from "@/lib/server/shop-staff";
import type { ShopListing, ShopOrder, ShopSeller, ShopStaff } from "@/lib/types/shop";

/**
 * Báo tin của chợ ra mọi kênh: chuông trong site, push (web + app native) và
 * Discord (nhắn riêng cho người trong đơn, đăng kênh nội bộ cho nhân sự).
 *
 * Mọi hàm ở đây đều "best-effort": kênh nào hỏng thì thôi kênh đó, không bao
 * giờ ném lỗi ngược lại luồng đơn hàng đang chạy. Người dùng có thể không nhận
 * được Discord, nhưng đơn thì không được phép fail vì Discord.
 *
 * Nội dung gửi đi cố ý nghèo nàn: mã đơn, tiền, bước tiếp theo. Thông tin cá
 * nhân và thông tin bàn giao chỉ nằm trong trang đơn, sau lớp kiểm tra quyền.
 */

const ORDER_COLOR: Partial<Record<OrderStatus, number>> = {
  pending_agent: BRAND.slate,
  awaiting_payment: BRAND.gold,
  payment_review: BRAND.gold,
  holding: BRAND.sky,
  delivering: BRAND.violet,
  payout: BRAND.blue,
  completed: BRAND.green,
  disputed: BRAND.red,
  cancelled: BRAND.slate,
};

export type NotifyAudience = "buyer" | "seller" | "agent" | "staff";

type OrderPeople = {
  buyerId: string;
  /** Chủ gian hàng + CTV được bật quyền xử lý đơn — họ cùng phải biết đơn chạy tới đâu. */
  sellerUserIds: string[];
  agentId: string | null;
};

async function peopleOf(order: ShopOrder): Promise<OrderPeople> {
  const sellerUserIds = await shopSideUserIds(order.seller_id).catch(() => [] as string[]);
  return {
    buyerId: order.buyer_id,
    sellerUserIds,
    agentId: order.agent_id,
  };
}

function orderUrl(order: ShopOrder): string {
  return `${SITE_URL}/shop/don-hang/${order.code}`;
}

/** Nhân sự nhận cảnh báo trong site: admin + giao dịch viên. */
async function staffUserIds(): Promise<string[]> {
  const client = createAdminSupabaseClient();
  if (!client) return [];
  const { data } = (await untypedFrom(client, "users")
    .select("id")
    .in("role", ["super_admin", "admin", "manager", "it", "agent"])
    .limit(200)) as { data: { id: string }[] | null };
  return (data ?? []).map((u) => u.id);
}

// ── Lõi gửi ─────────────────────────────────────────────────────────────────
type SendInput = {
  order: ShopOrder;
  to: NotifyAudience[];
  title: string;
  body: string;
  /** Người vừa thao tác — không tự báo cho chính mình. */
  exceptUserId?: string | null;
  /** Embed riêng cho kênh nội bộ; không có thì dựng embed đơn mặc định. */
  staffEmbed?: Embed;
  /** Ping role giao dịch viên trong kênh nội bộ (đơn mới, tranh chấp). */
  pingAgents?: boolean;
};

async function fanOut(input: SendInput): Promise<void> {
  const { order, to, title, body } = input;
  const url = orderUrl(order);
  const people = await peopleOf(order);

  const targets = new Set<string>();
  if (to.includes("buyer")) targets.add(people.buyerId);
  if (to.includes("seller")) for (const id of people.sellerUserIds) targets.add(id);
  if (to.includes("agent") && people.agentId) targets.add(people.agentId);
  if (to.includes("staff")) for (const id of await staffUserIds()) targets.add(id);
  if (input.exceptUserId) targets.delete(input.exceptUserId);

  const userIds = [...targets];
  const ids = await discordIds();

  await Promise.allSettled([
    createNotifications(
      userIds.map((user_id) => ({
        user_id,
        type: "shop_order",
        title,
        body,
        entity_type: "shop_order",
        entity_id: order.id,
        entity_url: `/shop/don-hang/${order.code}`,
      })),
    ),
    sendPushToUsers(userIds, title, body, `/shop/don-hang/${order.code}`),
    dmLinkedUsers(userIds, {
      embeds: [
        embed({
          title,
          description: body,
          url,
          color: ORDER_COLOR[order.status] ?? BRAND.gold,
          fields: [
            { name: "Mã đơn", value: `\`${order.code}\``, inline: true },
            { name: "Số tiền", value: vnd(order.amount), inline: true },
            { name: "Trạng thái", value: ORDER_STATUS_LABEL[order.status], inline: true },
          ],
        }),
      ],
      components: [row(linkButton("Mở đơn trên web", url, "🔗"))],
    }),
    to.includes("staff")
      ? sendChannelMessage(ids.staffChannelId, {
          ...(input.pingAgents && ids.agentRoleId
            ? {
                content: `<@&${ids.agentRoleId}>`,
                allowed_mentions: { roles: [ids.agentRoleId] },
              }
            : {}),
          embeds: [input.staffEmbed ?? defaultStaffEmbed(order, title, body)],
          components: [row(linkButton("Mở đơn", url, "🧾"))],
        })
      : Promise.resolve(null),
  ]);
}

function defaultStaffEmbed(order: ShopOrder, title: string, body: string): Embed {
  return embed({
    title,
    description: body,
    url: orderUrl(order),
    color: ORDER_COLOR[order.status] ?? BRAND.gold,
    fields: [
      { name: "Mã đơn", value: `\`${order.code}\``, inline: true },
      { name: "Số tiền", value: vnd(order.amount), inline: true },
      { name: "Phí", value: vnd(order.fee), inline: true },
      { name: "Tin đăng", value: order.listing?.title ?? "—" },
    ],
  });
}

/** Nhắn riêng Discord cho những ai đã liên kết tài khoản. */
async function dmLinkedUsers(userIds: string[], payload: MessagePayload): Promise<void> {
  if (userIds.length === 0) return;
  const map = await getDiscordIdsForUsers(userIds).catch(() => new Map<string, string>());
  if (map.size === 0) return;
  await Promise.allSettled([...map.values()].map((discordId) => sendDirectMessage(discordId, payload)));
}

// ── Sự kiện đơn hàng ────────────────────────────────────────────────────────
export function notifyOrderCreated(order: ShopOrder): Promise<void> {
  return fanOut({
    order,
    to: ["seller", "staff"],
    title: `Đơn mới ${order.code}`,
    body: `Có người đặt mua "${order.listing?.title ?? "tin của bạn"}" — ${vnd(order.amount)}. Đang chờ giao dịch viên nhận đơn.`,
    pingAgents: true,
  }).catch(() => undefined);
}

/**
 * Một bước của máy trạng thái vừa chạy xong: báo cho hai bên còn lại biết
 * đến lượt ai.
 */
export function notifyOrderStep(input: {
  order: ShopOrder;
  actorParty: OrderParty;
  actorId: string | null;
  label: string;
}): Promise<void> {
  const { order, actorParty, actorId, label } = input;

  return fanOut({
    order,
    // Chỉ ba bên trong đơn. Không đụng tới "staff": đơn đã có giao dịch viên
    // phụ trách rồi, báo cả đội mỗi bước thì chuông của admin không còn ai đọc.
    to: ["buyer", "seller", "agent"],
    exceptUserId: actorId,
    title: `${order.code} · ${ORDER_STATUS_LABEL[order.status]}`,
    body: `${PARTY_LABEL[actorParty] ?? "Hệ thống"} vừa ${label.toLowerCase()}.`,
  }).catch(() => undefined);
}

export function notifyOrderCancelled(order: ShopOrder, reason: string, actorId: string | null): Promise<void> {
  return fanOut({
    order,
    to: ["buyer", "seller", "agent", "staff"],
    exceptUserId: actorId,
    title: `Đơn ${order.code} đã huỷ`,
    body: reason.slice(0, 300),
  }).catch(() => undefined);
}

export function notifyDisputeOpened(order: ShopOrder, reason: string, actorId: string | null): Promise<void> {
  return fanOut({
    order,
    to: ["buyer", "seller", "agent", "staff"],
    exceptUserId: actorId,
    pingAgents: true,
    title: `⚠️ Tranh chấp đơn ${order.code}`,
    body: reason.slice(0, 300),
    staffEmbed: embed({
      title: `⚠️ Tranh chấp mới — ${order.code}`,
      description: reason.slice(0, 1500),
      url: orderUrl(order),
      color: BRAND.red,
      fields: [
        { name: "Số tiền đang giữ", value: vnd(order.amount), inline: true },
        { name: "Tin đăng", value: order.listing?.title ?? "—", inline: true },
      ],
    }),
  }).catch(() => undefined);
}

export function notifyDisputeResolved(order: ShopOrder, resolution: string, actorId: string | null): Promise<void> {
  return fanOut({
    order,
    to: ["buyer", "seller", "agent", "staff"],
    exceptUserId: actorId,
    title: `Tranh chấp ${order.code} đã xử lý`,
    body: resolution.slice(0, 300),
  }).catch(() => undefined);
}

/** Tin nhắn mới trong đơn — chỉ báo cho người trong đơn, không đụng kênh chung. */
export function notifyOrderMessage(input: {
  order: ShopOrder;
  senderParty: OrderParty;
  senderId: string | null;
  preview: string;
}): Promise<void> {
  const { order, senderParty, senderId, preview } = input;
  return fanOut({
    order,
    to: ["buyer", "seller", "agent"],
    exceptUserId: senderId,
    title: `Tin nhắn mới · đơn ${order.code}`,
    body: `${PARTY_LABEL[senderParty] ?? "Ai đó"}: ${preview.slice(0, 200)}`,
  }).catch(() => undefined);
}

const PARTY_LABEL: Record<string, string> = {
  buyer: "Người mua",
  seller: "Người bán",
  agent: "Giao dịch viên",
  admin: "Quản trị viên",
  system: "Hệ thống",
};

// ── Đơn treo ────────────────────────────────────────────────────────────────
function fmtIdle(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} phút`;
  if (hours < 48) return `${Math.round(hours)} giờ`;
  return `${Math.round(hours / 24)} ngày`;
}

/**
 * Cảnh báo đơn đứng yên quá lâu (xem STALE_ORDER_HOURS).
 *
 * Hai đường đi khác nhau, cố ý:
 *  - Đơn đã có người phụ trách → nhắn riêng đúng giao dịch viên đó. Đây là
 *    việc của họ, cả đội không cần biết.
 *  - Đơn chưa ai nhận → chỉ đăng kênh nội bộ kèm ping role giao dịch viên,
 *    vì chưa có ai để mà nhắc.
 *
 * Bản tóm tắt lên kênh nội bộ luôn có đủ cả hai nhóm, để người trực nhìn một
 * chỗ là thấy hết hàng chờ đang kẹt.
 */
export async function notifyStaleOrders(orders: ShopOrder[]): Promise<void> {
  if (orders.length === 0) return;

  try {
    const sorted = [...orders].sort(
      (a, b) => hoursSince(orderLastMoved(b)) - hoursSince(orderLastMoved(a)),
    );
    const unclaimed = sorted.filter((o) => !o.agent_id);

    const lines = sorted.slice(0, 12).map((o) => {
      const idle = fmtIdle(hoursSince(orderLastMoved(o)));
      const limit = STALE_ORDER_HOURS[o.status];
      const who = o.agent_id ? `chờ ${ORDER_WAITING_ON[o.status]}` : "**chưa ai nhận**";
      return `[\`${o.code}\`](${orderUrl(o)}) · ${vnd(o.amount)} · ${who} · đứng yên **${idle}**${
        limit ? ` (ngưỡng ${limit}h)` : ""
      }`;
    });
    if (sorted.length > lines.length) lines.push(`…và ${sorted.length - lines.length} đơn nữa.`);

    const ids = await discordIds();

    await Promise.allSettled([
      sendChannelMessage(ids.staffChannelId, {
        ...(unclaimed.length > 0 && ids.agentRoleId
          ? { content: `<@&${ids.agentRoleId}>`, allowed_mentions: { roles: [ids.agentRoleId] } }
          : {}),
        embeds: [
          embed({
            title: `⏳ ${sorted.length} đơn đang treo`,
            description: lines.join("\n").slice(0, 3800),
            color: BRAND.red,
            fields: [
              { name: "Chưa ai nhận", value: String(unclaimed.length), inline: true },
              { name: "Đã có người phụ trách", value: String(sorted.length - unclaimed.length), inline: true },
              {
                name: "Tiền đang kẹt",
                value: vnd(sorted.reduce((s, o) => s + o.amount, 0)),
                inline: true,
              },
            ],
            footer: { text: "Quét tự động · đơn không nhúc nhích quá ngưỡng của bước hiện tại" },
          }),
        ],
        components: [row(linkButton("Mở bàn làm việc", `${SITE_URL}/admin/shop`, "🧰"))],
      }),
      pingAssignedAgents(sorted.filter((o) => o.agent_id)),
    ]);
  } catch {
    /* best-effort */
  }
}

/** Gom đơn treo theo người phụ trách rồi nhắc mỗi người đúng phần của mình. */
async function pingAssignedAgents(orders: ShopOrder[]): Promise<void> {
  const byAgent = new Map<string, ShopOrder[]>();
  for (const o of orders) {
    if (!o.agent_id) continue;
    const list = byAgent.get(o.agent_id);
    if (list) list.push(o);
    else byAgent.set(o.agent_id, [o]);
  }
  if (byAgent.size === 0) return;

  await Promise.allSettled(
    [...byAgent.entries()].map(async ([agentId, rows]) => {
      const worst = rows[0];
      const title = `⏳ ${rows.length} đơn của bạn đang treo`;
      const body =
        rows.length === 1
          ? `${worst.code} đứng yên ${fmtIdle(hoursSince(orderLastMoved(worst)))} — đang chờ ${ORDER_WAITING_ON[worst.status]}.`
          : `Cũ nhất: ${worst.code} (${fmtIdle(hoursSince(orderLastMoved(worst)))}). Vào xử lý trước khi khách hỏi.`;
      const url = rows.length === 1 ? `/shop/don-hang/${worst.code}` : "/shop/ctv";

      await Promise.allSettled([
        createNotifications([
          {
            user_id: agentId,
            type: "shop_order",
            title,
            body,
            entity_type: "shop_order",
            entity_id: worst.id,
            entity_url: url,
          },
        ]),
        sendPushToUsers([agentId], title, body, url),
        dmLinkedUsers([agentId], {
          embeds: [
            embed({
              title,
              description: rows
                .slice(0, 10)
                .map(
                  (o) =>
                    `[\`${o.code}\`](${orderUrl(o)}) · ${vnd(o.amount)} · chờ ${ORDER_WAITING_ON[o.status]} · ${fmtIdle(hoursSince(orderLastMoved(o)))}`,
                )
                .join("\n"),
              color: BRAND.red,
            }),
          ],
          components: [row(linkButton("Bàn giao dịch viên", `${SITE_URL}/shop/ctv`, "🤝"))],
        }),
      ]);
    }),
  );
}

// ── Tin đăng ────────────────────────────────────────────────────────────────
/**
 * Tin vừa được duyệt lên sàn: báo người bán, đăng ra kênh chợ Discord, và
 * đánh thức những người đang theo dõi bộ lọc khớp với tin này.
 */
export async function notifyListingApproved(listing: ShopListing): Promise<void> {
  try {
    const url = `${SITE_URL}/shop/${listing.id}`;
    const seller = await getSellerById(listing.seller_id).catch(() => null);
    const ids = await discordIds();

    const listingEmbed = embed({
      title: listing.title,
      url,
      description: listing.description.slice(0, 400),
      color: BRAND.gold,
      author: { name: `🏪 ${seller?.display_name ?? "Người bán Arex"}` },
      fields: [
        {
          name: "💰 Giá",
          value:
            vnd(effectivePrice(listing)) +
            (isSaleLive(listing) ? ` (giảm ${discountPercent(listing)}%, gốc ${vnd(listing.price)})` : "") +
            (listing.negotiable ? " (thương lượng)" : ""),
          inline: true,
        },
        { name: "📦 Loại", value: listing.kind === "account" ? "Tài khoản" : "Vật phẩm", inline: true },
        {
          name: "🛡 Uy tín người bán",
          value: seller
            ? `${seller.orders_done} đơn thành công${seller.rating_count > 0 ? ` · ${(seller.rating_sum / seller.rating_count).toFixed(1)}★` : ""}`
            : "—",
          inline: true,
        },
        ...Object.entries(listing.details ?? {})
          .slice(0, 6)
          .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
      ],
      ...(listing.images[0] ? { image: { url: listing.images[0] } } : {}),
      footer: { text: "Mua qua trung gian Arex · tiền chỉ về người bán khi bạn xác nhận" },
    });

    await Promise.allSettled([
      // Người bán biết tin đã lên sàn
      seller?.user_id
        ? createNotifications([
            {
              user_id: seller.user_id,
              type: "shop_listing",
              title: "Tin của bạn đã được duyệt",
              body: listing.title,
              entity_type: "shop_listing",
              entity_id: listing.id,
              entity_url: `/shop/${listing.id}`,
            },
          ])
        : Promise.resolve(),
      sendChannelMessage(ids.shopChannelId, {
        embeds: [listingEmbed],
        components: [
          row(
            linkButton("Xem chi tiết", url, "🔍"),
            linkButton("Đặt mua", `${url}#dat-mua`, "🛒"),
            linkButton("Vào chợ", `${SITE_URL}/shop`, "🏪"),
          ),
        ],
      }),
      notifyWatchlistMatches(listing),
    ]);
  } catch {
    /* best-effort */
  }
}

export async function notifyListingRejected(listing: ShopListing, reason: string): Promise<void> {
  try {
    const seller = await getSellerById(listing.seller_id);
    if (!seller?.user_id) return;
    await createNotifications([
      {
        user_id: seller.user_id,
        type: "shop_listing",
        title: "Tin đăng bị từ chối",
        body: `${listing.title} — ${reason}`.slice(0, 300),
        entity_type: "shop_listing",
        entity_id: listing.id,
        entity_url: `/shop/tin-cua-toi`,
      },
    ]);
  } catch {
    /* best-effort */
  }
}

/**
 * Yêu cầu đẩy nổi bật được duyệt.
 *
 * Chỉ báo cho người bán, không đăng ra kênh Discord: tin đã lên sàn từ trước
 * nên kênh chợ đã có bài của nó rồi, đăng lại chỉ là lặp.
 */
export async function notifyListingFeatured(listing: ShopListing, days: number): Promise<void> {
  try {
    const seller = await getSellerById(listing.seller_id);
    if (!seller?.user_id) return;
    await createNotifications([
      {
        user_id: seller.user_id,
        type: "shop_listing",
        title: "Tin của bạn được đẩy nổi bật",
        body: `${listing.title} — ghim ở dải nổi bật trong ${days} ngày.`.slice(0, 300),
        entity_type: "shop_listing",
        entity_id: listing.id,
        entity_url: `/shop/${listing.id}`,
      },
    ]);
  } catch {
    /* best-effort */
  }
}

/** Yêu cầu đẩy nổi bật bị từ chối — tin vẫn bán bình thường, chỉ không được ghim. */
export async function notifyFeatureRejected(listing: ShopListing): Promise<void> {
  try {
    const seller = await getSellerById(listing.seller_id);
    if (!seller?.user_id) return;
    await createNotifications([
      {
        user_id: seller.user_id,
        type: "shop_listing",
        title: "Yêu cầu đẩy nổi bật không được duyệt",
        body: `${listing.title} — tin vẫn đang bán bình thường.`.slice(0, 300),
        entity_type: "shop_listing",
        entity_id: listing.id,
        entity_url: `/shop/tin-cua-toi`,
      },
    ]);
  } catch {
    /* best-effort */
  }
}

// ── CTV của gian hàng ───────────────────────────────────────────────────────
/**
 * Ba hàm dưới đây chỉ báo trong site + push, không đụng tới Discord: việc nhân
 * sự của một gian hàng là chuyện riêng giữa chủ shop và người được mời, không
 * phải thứ để đăng lên kênh chung.
 */
async function tellUser(
  userId: string | null,
  title: string,
  body: string,
  url: string,
  entityId: string,
): Promise<void> {
  if (!userId) return;
  try {
    await Promise.allSettled([
      createNotifications([
        {
          user_id: userId,
          type: "shop_staff",
          title,
          body: body.slice(0, 300),
          entity_type: "shop_staff",
          entity_id: entityId,
          entity_url: url,
        },
      ]),
      sendPushToUsers([userId], title, body, url),
    ]);
  } catch {
    /* best-effort */
  }
}

/** Có người mời bạn làm CTV. */
export async function notifyStaffInvite(staff: ShopStaff, shop: ShopSeller): Promise<void> {
  await tellUser(
    staff.user_id,
    "Lời mời làm CTV gian hàng",
    `${shop.display_name} mời bạn phụ bán cùng. Vào trang nhân sự để đồng ý hoặc từ chối.`,
    "/shop/nhan-su",
    staff.id,
  );
}

/** Người được mời đã trả lời — báo lại cho chủ shop. */
export async function notifyStaffInviteAnswered(staff: ShopStaff, accepted: boolean): Promise<void> {
  try {
    const seller = await getSellerById(staff.seller_id);
    await tellUser(
      seller?.user_id ?? null,
      accepted ? "CTV đã nhận lời" : "CTV đã từ chối lời mời",
      accepted
        ? "Người bạn mời đã bắt đầu làm CTV cho gian hàng."
        : "Người bạn mời đã từ chối. Bạn có thể mời người khác.",
      "/shop/nhan-su",
      staff.id,
    );
  } catch {
    /* best-effort */
  }
}

/** Gỡ CTV: chủ shop gỡ thì báo cho CTV, CTV tự nghỉ thì báo cho chủ shop. */
export async function notifyStaffRevoked(
  staff: ShopStaff,
  options: { bySelf: boolean },
): Promise<void> {
  try {
    const seller = await getSellerById(staff.seller_id);
    if (options.bySelf) {
      await tellUser(
        seller?.user_id ?? null,
        "Một CTV đã nghỉ",
        "Người này không còn quyền đăng tin hay xử lý đơn cho gian hàng của bạn.",
        "/shop/nhan-su",
        staff.id,
      );
      return;
    }
    await tellUser(
      staff.user_id,
      "Bạn không còn là CTV",
      `Gian hàng ${seller?.display_name ?? "này"} đã gỡ quyền CTV của bạn.`,
      "/shop/nhan-su",
      staff.id,
    );
  } catch {
    /* best-effort */
  }
}

// ── Theo dõi bộ lọc ─────────────────────────────────────────────────────────
type WatchRow = {
  user_id: string;
  label: string;
  keyword: string | null;
  kind: string | null;
  min_price: number | null;
  max_price: number | null;
};

function matchesWatch(listing: ShopListing, w: WatchRow): boolean {
  if (w.kind && w.kind !== listing.kind) return false;
  // So theo giá đang bán: người đặt trần 500k muốn được báo cả khi một tin 600k
  // hạ xuống 450k — đó đúng là lúc bộ lọc của họ trở nên có ích.
  const price = effectivePrice(listing);
  if (w.min_price != null && price < w.min_price) return false;
  if (w.max_price != null && price > w.max_price) return false;
  if (w.keyword) {
    const haystack = `${listing.title} ${listing.description}`.toLowerCase();
    const needle = w.keyword.toLowerCase().trim();
    if (needle && !haystack.includes(needle)) return false;
  }
  return true;
}

/**
 * So khớp tin mới với các bộ lọc đang theo dõi.
 *
 * Cố tình so khớp trong Node thay vì viết truy vấn SQL lồng nhau: số bộ lọc
 * bật thông báo nhỏ (mỗi người tối đa 10), còn điều kiện thì hay đổi.
 */
async function notifyWatchlistMatches(listing: ShopListing): Promise<void> {
  const client = createAdminSupabaseClient();
  if (!client) return;

  const { data } = (await untypedFrom(client, "shop_watchlists")
    .select("user_id, label, keyword, kind, min_price, max_price")
    .eq("notify", true)
    .limit(2000)) as { data: WatchRow[] | null };

  const rows = data ?? [];
  if (rows.length === 0) return;

  const seller = await getSellerById(listing.seller_id).catch(() => null);
  const hit = new Map<string, string>();
  for (const w of rows) {
    if (w.user_id === seller?.user_id) continue; // đừng báo tin của chính mình
    if (matchesWatch(listing, w)) hit.set(w.user_id, w.label || "bộ lọc của bạn");
  }
  if (hit.size === 0) return;

  const userIds = [...hit.keys()];
  const title = "Có tin mới khớp bộ lọc của bạn";
  const body =
    `${listing.title} — ${vnd(effectivePrice(listing))}` +
    (isSaleLive(listing) ? ` (giảm ${discountPercent(listing)}%)` : "");

  await Promise.allSettled([
    createNotifications(
      userIds.map((user_id) => ({
        user_id,
        type: "shop_watchlist",
        title,
        body,
        entity_type: "shop_listing",
        entity_id: listing.id,
        entity_url: `/shop/${listing.id}`,
      })),
    ),
    sendPushToUsers(userIds, title, body, `/shop/${listing.id}`),
  ]);
}
