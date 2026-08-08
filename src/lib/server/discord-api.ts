import "server-only";
import { getSettings } from "@/lib/data/content-service";
import type { MessagePayload } from "@/lib/server/discord-ui";

/**
 * Gọi REST API của Discord bằng bot token.
 *
 * Khác `discord-notify.ts` (webhook): webhook chỉ đăng được embed vào đúng một
 * kênh cố định. Bot token thì gửi được tin nhắn riêng, tạo thread, gán role,
 * và — quan trọng nhất — đính kèm được nút bấm để người dùng thao tác ngay
 * trong Discord.
 *
 * Thiếu DISCORD_BOT_TOKEN thì mọi hàm ở đây im lặng trả null. Không có kênh
 * Discord nào được phép làm hỏng một luồng nghiệp vụ của chợ.
 */

const API = "https://discord.com/api/v10";

export const discordEnv = {
  get token() {
    return process.env.DISCORD_BOT_TOKEN ?? "";
  },
  get appId() {
    return process.env.DISCORD_APP_ID ?? "";
  },
  get publicKey() {
    return process.env.DISCORD_PUBLIC_KEY ?? "";
  },
  get guildId() {
    return process.env.DISCORD_GUILD_ID ?? "";
  },
  /** Kênh đăng tin chợ mới. */
  get shopChannelId() {
    return process.env.DISCORD_SHOP_CHANNEL_ID ?? "";
  },
  /** Kênh nội bộ: đơn mới, tranh chấp, cảnh báo. */
  get staffChannelId() {
    return process.env.DISCORD_STAFF_CHANNEL_ID ?? "";
  },
  /** Kênh đặt bảng mở ticket. */
  get ticketChannelId() {
    return process.env.DISCORD_TICKET_CHANNEL_ID ?? "";
  },
  /** Kênh nhắc sự kiện Free Fire. */
  get eventChannelId() {
    return process.env.DISCORD_EVENT_CHANNEL_ID ?? "";
  },
  /** Role được ping khi có đơn chờ giao dịch viên. */
  get agentRoleId() {
    return process.env.DISCORD_AGENT_ROLE_ID ?? "";
  },
  /** Role gán cho người đã liên kết tài khoản site. */
  get linkedRoleId() {
    return process.env.DISCORD_LINKED_ROLE_ID ?? "";
  },
  /** Role gán cho người bán đã được duyệt. */
  get sellerRoleId() {
    return process.env.DISCORD_SELLER_ROLE_ID ?? "";
  },
  /** Role gán cho quản trị/nhân sự. */
  get staffRoleId() {
    return process.env.DISCORD_STAFF_ROLE_ID ?? "";
  },
};

// ── Toàn bộ cấu hình sửa được trong /admin/settings ───────────────────────
// Trước đây mọi thứ nằm ở biến môi trường, đổi một ID kênh cũng phải deploy
// lại. Giờ settings được ưu tiên, biến môi trường chỉ là lưới đỡ cho ô còn
// trống — cấu hình sẵn có không vỡ, mà admin vẫn tự xoay được.
//
// Bot token nằm trong SENSITIVE_KEYS nên được mã hoá AES trong DB và API admin
// chỉ trả về mặt nạ "__configured__", không bao giờ lộ giá trị thật ra client.

const DISCORD_CRED_KEYS = {
  token:     "integrations.discord_bot_token",
  appId:     "integrations.discord_app_id",
  publicKey: "integrations.discord_public_key",
} as const;

const DISCORD_ID_KEYS = {
  guildId:         "integrations.discord_guild_id",
  shopChannelId:   "integrations.discord_shop_channel_id",
  staffChannelId:  "integrations.discord_staff_channel_id",
  ticketChannelId: "integrations.discord_ticket_channel_id",
  eventChannelId:  "integrations.discord_event_channel_id",
  agentRoleId:     "integrations.discord_agent_role_id",
  linkedRoleId:    "integrations.discord_linked_role_id",
  sellerRoleId:    "integrations.discord_seller_role_id",
  staffRoleId:     "integrations.discord_staff_role_id",
} as const;

const DISCORD_SETTING_KEYS = { ...DISCORD_CRED_KEYS, ...DISCORD_ID_KEYS } as const;

export type DiscordIdKey = keyof typeof DISCORD_ID_KEYS;
export type DiscordIds = Record<DiscordIdKey, string>;
export type DiscordCredKey = keyof typeof DISCORD_CRED_KEYS;
export type DiscordCreds = Record<DiscordCredKey, string>;
type DiscordField = keyof typeof DISCORD_SETTING_KEYS;

/** Danh sách key settings để trang admin render đúng ô. */
export const DISCORD_ID_SETTING_KEYS = Object.values(DISCORD_ID_KEYS);
export const DISCORD_CRED_SETTING_KEYS = Object.values(DISCORD_CRED_KEYS);

/**
 * Giá trị hiện hành của mọi ô cấu hình Discord. `getSettings` được bọc `cache()`
 * nên gọi nhiều lần trong một request không tốn thêm truy vấn.
 */
async function discordConfig(): Promise<Record<DiscordField, string>> {
  let settings: Awaited<ReturnType<typeof getSettings>> = [];
  try {
    settings = await getSettings();
  } catch {
    // DB lỗi thì vẫn chạy được bằng env — Discord không được chặn nghiệp vụ.
  }

  const entries = Object.entries(DISCORD_SETTING_KEYS) as Array<[DiscordField, string]>;
  const out = {} as Record<DiscordField, string>;
  for (const [field, settingKey] of entries) {
    out[field] = settings.find((s) => s.key === settingKey)?.value?.trim() || discordEnv[field];
  }
  return out;
}

/** ID kênh/role hiện hành. */
export async function discordIds(): Promise<DiscordIds> {
  const { token: _t, appId: _a, publicKey: _p, ...ids } = await discordConfig();
  return ids;
}

/** Token/App ID/Public Key hiện hành. */
export async function discordCreds(): Promise<DiscordCreds> {
  const { token, appId, publicKey } = await discordConfig();
  return { token, appId, publicKey };
}

export async function hasDiscordBot(): Promise<boolean> {
  return !!(await discordCreds()).token;
}

type RestResult<T> = T | null;

async function rest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<RestResult<T>> {
  const { token } = await discordCreds();
  if (!token) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });

    // 429: Discord bảo chờ. Thử lại đúng một lần rồi thôi — đây là kênh phụ,
    // không đáng để giữ request của người dùng lâu hơn.
    if (res.status === 429) {
      const retry = (await res.json().catch(() => null)) as { retry_after?: number } | null;
      const waitMs = Math.min(5000, Math.round((retry?.retry_after ?? 1) * 1000));
      await new Promise((r) => setTimeout(r, waitMs));
      return rest<T>(method, path, body);
    }

    if (res.status === 204) return {} as T;
    if (!res.ok) {
      console.error("[discord-api]", method, path, res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json().catch(() => ({}))) as T;
  } catch (err) {
    console.error("[discord-api]", method, path, err);
    return null;
  }
}

// ── Tin nhắn ────────────────────────────────────────────────────────────────
export type DiscordMessage = { id: string; channel_id: string };

export function sendChannelMessage(channelId: string, payload: MessagePayload) {
  if (!channelId) return Promise.resolve(null);
  return rest<DiscordMessage>("POST", `/channels/${channelId}/messages`, {
    allowed_mentions: { parse: [] },
    ...payload,
  });
}

export function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: MessagePayload,
) {
  return rest<DiscordMessage>("PATCH", `/channels/${channelId}/messages/${messageId}`, payload);
}

/**
 * Nhắn riêng cho một người. Người chặn DM từ server thì Discord trả 403 —
 * coi như gửi hụt, không phải lỗi cần báo lên.
 */
export async function sendDirectMessage(discordUserId: string, payload: MessagePayload) {
  if (!discordUserId) return null;
  const channel = await rest<{ id: string }>("POST", "/users/@me/channels", {
    recipient_id: discordUserId,
  });
  if (!channel?.id) return null;
  return sendChannelMessage(channel.id, payload);
}

// ── Role ────────────────────────────────────────────────────────────────────
export function addGuildRole(guildId: string, userId: string, roleId: string) {
  if (!guildId || !userId || !roleId) return Promise.resolve(null);
  return rest("PUT", `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export function removeGuildRole(guildId: string, userId: string, roleId: string) {
  if (!guildId || !userId || !roleId) return Promise.resolve(null);
  return rest("DELETE", `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export function getGuildMember(guildId: string, userId: string) {
  return rest<{ roles: string[]; nick: string | null; user?: { username: string } }>(
    "GET",
    `/guilds/${guildId}/members/${userId}`,
  );
}

// ── Thread (ticket) ─────────────────────────────────────────────────────────
export function createPrivateThread(channelId: string, name: string) {
  return rest<{ id: string }>("POST", `/channels/${channelId}/threads`, {
    name: name.slice(0, 100),
    // 12 = private thread. Chỉ người được thêm mới thấy nội dung ticket.
    type: 12,
    invitable: false,
    auto_archive_duration: 1440,
  });
}

export function addThreadMember(threadId: string, userId: string) {
  return rest("PUT", `/channels/${threadId}/thread-members/${userId}`);
}

export function archiveThread(threadId: string) {
  return rest("PATCH", `/channels/${threadId}`, { archived: true, locked: true });
}

// ── Đăng ký slash command ───────────────────────────────────────────────────
/**
 * Ghi đè toàn bộ danh sách lệnh. Có `guildId` thì lệnh hiện ngay (dùng khi
 * phát triển); không có thì đăng ký toàn cục, Discord mất tới 1 giờ để đẩy.
 */
export async function overwriteCommands(commands: unknown[], guildId?: string) {
  const { appId } = await discordCreds();
  if (!appId) return null;
  const path = guildId
    ? `/applications/${appId}/guilds/${guildId}/commands`
    : `/applications/${appId}/commands`;
  return rest("PUT", path, commands);
}
