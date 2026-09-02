import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit, getClientKey } from "@/lib/server/api-guard";
import { getSettings, getSettingsByKeys, updateSetting } from "@/lib/data/content-service";
import { unblockInMemory, getInMemoryBlockedIps } from "@/lib/server/ip-blocker";
import {
  SETTINGS_KEY_BLOCKED_IPS,
  SETTINGS_KEY_IP_WHITELIST,
  activeBlocks,
  parseBlockedIps,
  parseIpWhitelist,
  removeBlock,
  upsertBlock,
  type BlockedIp,
} from "@/lib/constants/ip-block";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { VISITOR_IPS_KEY, type VisitorEntry } from "@/lib/server/visitor-logger";

const BLOCKED_IPS_KEY = SETTINGS_KEY_BLOCKED_IPS;
const WHITELIST_KEY = SETTINGS_KEY_IP_WHITELIST;

async function getVisitorLog(): Promise<VisitorEntry[]> {
  // Key này bị loại khỏi getSettings() vì quá nặng — phải lấy riêng.
  const settings = await getSettingsByKeys([VISITOR_IPS_KEY]);
  const raw = settings.find((s) => s.key === VISITOR_IPS_KEY)?.value ?? "{}";
  try {
    const map = JSON.parse(raw) as Record<string, VisitorEntry>;
    return Object.values(map).sort((a, b) => b.lastSeen - a.lastSeen);
  } catch { return []; }
}

type BlockedEntry = BlockedIp;

async function getWhitelist(): Promise<string[]> {
  const settings = await getSettings();
  return parseIpWhitelist(settings.find((s) => s.key === WHITELIST_KEY)?.value ?? null);
}

async function getBlockedList(): Promise<BlockedEntry[]> {
  const settings = await getSettings();
  return parseBlockedIps(settings.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? null);
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const [dbList, memList] = await Promise.all([getBlockedList(), Promise.resolve(getInMemoryBlockedIps())]);

  // Gộp DB + bộ nhớ máy này, mỗi IP một dòng. Bản trong RAM đứng trước vì nó
  // mới nhất (vừa chặn xong, settings có thể chưa kịp đọc lại).
  const seen = new Set<string>();
  const merged: BlockedEntry[] = [];
  for (const e of [...memList.map((m) => ({ ...m }) as BlockedEntry), ...dbList]) {
    if (!seen.has(e.ip)) { seen.add(e.ip); merged.push(e); }
  }

  const active = activeBlocks(merged);
  const history = merged.slice(0, 100);

  const [whitelist, visitors] = await Promise.all([getWhitelist(), getVisitorLog()]);
  return NextResponse.json({ blocked: active, history, whitelist, visitors });
}

const unblockSchema = z.object({ ip: z.string().min(1) });

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = unblockSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { ip } = parsed.data;

  // Remove from in-memory
  unblockInMemory(ip);

  // Remove from DB
  await updateSetting(BLOCKED_IPS_KEY, JSON.stringify(removeBlock(await getBlockedList(), ip)));

  await logAdminActivity({
    action: "IP_UNBLOCKED",
    targetType: "SECURITY",
    summary: `Mở chặn IP: ${ip}`,
  });

  return NextResponse.json({ ok: true });
}

const whitelistSchema = z.object({
  action: z.enum(["add", "remove"]),
  ip: z.string().min(7, "IP không hợp lệ."),
});

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = whitelistSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const { action, ip } = parsed.data;
  const list = await getWhitelist();
  const updated = action === "add"
    ? list.includes(ip) ? list : [...list, ip]
    : list.filter((x) => x !== ip);
  await updateSetting(WHITELIST_KEY, JSON.stringify(updated));

  await logAdminActivity({
    action: action === "add" ? "IP_WHITELIST_ADD" : "IP_WHITELIST_REMOVE",
    targetType: "SECURITY",
    summary: `${action === "add" ? "Thêm" : "Xóa"} IP khỏi danh sách trắng admin: ${ip}`,
  });

  return NextResponse.json({ ok: true, whitelist: updated });
}

const blockSchema = z.object({
  ip: z.string().min(1),
  reason: z.string().optional(),
  /** Số giờ chặn; bỏ trống = vĩnh viễn cho tới khi mở tay. */
  hours: z.number().int().positive().max(24 * 365).optional(),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { ip, reason = "Chặn thủ công bởi admin", hours } = parsed.data;
  const now = Date.now();
  // Chặn tay mặc định là VĨNH VIỄN. Bản cũ tự hết hạn sau 1 giờ nên bấm chặn
  // xong kẻ phá quay lại ngay hôm đó — mà thật ra bản cũ còn chẳng chặn nổi.
  const entry: BlockedEntry = {
    ip: ip.trim().toLowerCase(),
    blockedAt: now,
    reason,
    expiresAt: hours ? now + hours * 60 * 60 * 1000 : null,
    by: "admin",
  };

  await updateSetting(
    BLOCKED_IPS_KEY,
    JSON.stringify(upsertBlock(await getBlockedList(), entry, now)),
  );

  await logAdminActivity({
    action: "IP_BLOCKED",
    targetType: "SECURITY",
    summary: `Chặn thủ công IP: ${ip} — ${reason}${hours ? ` (${hours} giờ)` : " (vĩnh viễn)"}`,
  });

  return NextResponse.json({ ok: true });
}
