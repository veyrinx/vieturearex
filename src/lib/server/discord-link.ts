import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { addGuildRole, discordIds, getGuildMember, removeGuildRole } from "@/lib/server/discord-api";

/**
 * Liên kết tài khoản Discord ↔ tài khoản Arex.
 *
 * Cùng cách làm với Telegram (`telegram_link_codes`): web tạo mã 6 ký tự sống
 * 10 phút, người dùng gõ `/lienket <mã>` trong Discord. Không dùng OAuth vì
 * không cần quyền gì của Discord — chỉ cần biết chắc hai tài khoản là một
 * người, mà mã dùng-một-lần đã đủ.
 *
 * Snowflake của Discord vượt quá số nguyên an toàn của JS nên `discord_user_id`
 * luôn là chuỗi từ đầu tới cuối.
 */

const TTL_MS = 10 * 60_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm

export type DiscordLink = {
  discord_user_id: string;
  user_id: string;
  discord_username: string | null;
  linked_at: string;
};

function db() {
  return createAdminSupabaseClient();
}

export function generateLinkCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Web gọi: tạo mã mới cho người đang đăng nhập (huỷ mã cũ của họ). */
export async function issueLinkCode(userId: string): Promise<{ code: string; expiresInSec: number } | null> {
  const client = db();
  if (!client) return null;

  await untypedFrom(client, "discord_link_codes").delete().eq("user_id", userId);

  const code = generateLinkCode();
  const { error } = await untypedFrom(client, "discord_link_codes").insert({
    code,
    user_id: userId,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  } as never);
  if (error) return null;

  return { code, expiresInSec: Math.floor(TTL_MS / 1000) };
}

export type RedeemResult =
  | { ok: true; userId: string; displayName: string | null }
  | { ok: false; error: string };

/** Bot gọi: đổi mã lấy liên kết. */
export async function redeemLinkCode(
  code: string,
  discordUserId: string,
  discordUsername?: string,
  guildId?: string,
): Promise<RedeemResult> {
  const client = db();
  if (!client) return { ok: false, error: "Hệ thống chưa sẵn sàng, thử lại sau." };

  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
    return { ok: false, error: "Mã không đúng định dạng." };
  }

  const { data: row } = (await untypedFrom(client, "discord_link_codes")
    .select("code, user_id, expires_at")
    .eq("code", normalized)
    .maybeSingle()) as { data: { user_id: string; expires_at: string } | null };

  if (!row) return { ok: false, error: "Mã không đúng hoặc đã được dùng." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await untypedFrom(client, "discord_link_codes").delete().eq("code", normalized);
    return { ok: false, error: "Mã đã hết hạn. Tạo mã mới trên web nhé." };
  }

  // Một tài khoản site ↔ một tài khoản Discord: dọn cả hai phía trước khi ghi.
  await untypedFrom(client, "discord_account_links").delete().eq("user_id", row.user_id);
  await untypedFrom(client, "discord_account_links").delete().eq("discord_user_id", discordUserId);

  const { error } = await untypedFrom(client, "discord_account_links").insert({
    discord_user_id: discordUserId,
    user_id: row.user_id,
    discord_username: discordUsername ?? null,
    guild_id: guildId ?? null,
  } as never);
  if (error) return { ok: false, error: "Không lưu được liên kết, thử lại." };

  await untypedFrom(client, "discord_link_codes").delete().eq("user_id", row.user_id);

  const { data: profile } = (await untypedFrom(client, "users")
    .select("display_name, handle")
    .eq("id", row.user_id)
    .maybeSingle()) as { data: { display_name: string | null; handle: string | null } | null };

  return {
    ok: true,
    userId: row.user_id,
    displayName: profile?.display_name ?? profile?.handle ?? null,
  };
}

export async function unlinkDiscord(discordUserId: string): Promise<void> {
  const client = db();
  if (!client) return;
  await untypedFrom(client, "discord_account_links").delete().eq("discord_user_id", discordUserId);
}

export async function getLinkByDiscordId(discordUserId: string): Promise<DiscordLink | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "discord_account_links")
    .select("*")
    .eq("discord_user_id", discordUserId)
    .maybeSingle()) as { data: DiscordLink | null };
  return data;
}

export async function getLinkByUserId(userId: string): Promise<DiscordLink | null> {
  const client = db();
  if (!client) return null;
  const { data } = (await untypedFrom(client, "discord_account_links")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as { data: DiscordLink | null };
  return data;
}

/** Discord ID của nhiều tài khoản site cùng lúc — dùng khi bắn thông báo đơn. */
export async function getDiscordIdsForUsers(userIds: string[]): Promise<Map<string, string>> {
  const client = db();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!client || ids.length === 0) return new Map();
  const { data } = (await untypedFrom(client, "discord_account_links")
    .select("discord_user_id, user_id")
    .in("user_id", ids)) as { data: { discord_user_id: string; user_id: string }[] | null };
  return new Map((data ?? []).map((r) => [r.user_id, r.discord_user_id]));
}

// ── Đồng bộ role ────────────────────────────────────────────────────────────
const STAFF_ROLES = ["super_admin", "admin", "it", "manager", "support"];

/**
 * Gán role Discord theo vai trò trên site.
 *
 * Chỉ đụng vào đúng những role do Arex quản lý (đã đặt trong env) — role cộng
 * đồng tự phong khác giữ nguyên. Gỡ role khi người dùng mất quyền, để một
 * người bị khoá bán hàng không còn giữ tag "Người bán" trong server.
 */
export async function syncDiscordRoles(userId: string, discordUserId?: string): Promise<void> {
  const client = db();
  const ids = await discordIds();
  const guildId = ids.guildId;
  if (!client || !guildId) return;

  const targetDiscordId = discordUserId ?? (await getLinkByUserId(userId))?.discord_user_id;
  if (!targetDiscordId) return;

  // Người đã rời server thì không có gì để gán.
  const member = await getGuildMember(guildId, targetDiscordId);
  if (!member) return;

  const [profileRes, sellerRes] = await Promise.all([
    untypedFrom(client, "users").select("role").eq("id", userId).maybeSingle(),
    untypedFrom(client, "shop_sellers").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  const profile = profileRes.data as { role: string | null } | null;
  const seller = sellerRes.data as { status: string } | null;

  const role = profile?.role ?? "user";
  const wanted: Record<string, boolean> = {
    [ids.linkedRoleId]: true,
    [ids.sellerRoleId]: seller?.status === "approved",
    [ids.agentRoleId]: role === "agent" || STAFF_ROLES.includes(role),
    [ids.staffRoleId]: STAFF_ROLES.includes(role),
  };

  await Promise.allSettled(
    Object.entries(wanted)
      .filter(([roleId]) => !!roleId)
      .map(([roleId, want]) =>
        want
          ? addGuildRole(guildId, targetDiscordId, roleId)
          : member.roles.includes(roleId)
            ? removeGuildRole(guildId, targetDiscordId, roleId)
            : Promise.resolve(null),
      ),
  );

  await untypedFrom(client, "discord_account_links")
    .update({ roles_synced_at: new Date().toISOString(), guild_id: guildId } as never)
    .eq("discord_user_id", targetDiscordId);
}
