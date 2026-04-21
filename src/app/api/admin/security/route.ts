import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit, getClientKey } from "@/lib/server/api-guard";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { unblockInMemory, getInMemoryBlockedIps, getFailureCount } from "@/lib/server/ip-blocker";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { VISITOR_IPS_KEY, type VisitorEntry } from "@/lib/server/visitor-logger";

const BLOCKED_IPS_KEY = "security.blocked_ips";
const WHITELIST_KEY = "security.admin_ip_whitelist";

async function getVisitorLog(): Promise<VisitorEntry[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === VISITOR_IPS_KEY)?.value ?? "{}";
  try {
    const map = JSON.parse(raw) as Record<string, VisitorEntry>;
    return Object.values(map).sort((a, b) => b.lastSeen - a.lastSeen);
  } catch { return []; }
}

type BlockedEntry = { ip: string; blockedAt: number; reason: string };

async function getWhitelist(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === WHITELIST_KEY)?.value ?? "[]";
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

async function getBlockedList(): Promise<BlockedEntry[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? "[]";
  try {
    const list: BlockedEntry[] = JSON.parse(raw);
    const now = Date.now();
    const BLOCK_DURATION_MS = 60 * 60 * 1000;
    return list.filter((e) => now - e.blockedAt < BLOCK_DURATION_MS * 24); // keep 24h of history
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const [dbList, memList] = await Promise.all([getBlockedList(), Promise.resolve(getInMemoryBlockedIps())]);

  // Merge DB + in-memory, dedupe by IP
  const seen = new Set<string>();
  const merged: BlockedEntry[] = [];
  for (const e of [...memList, ...dbList]) {
    if (!seen.has(e.ip)) { seen.add(e.ip); merged.push(e); }
  }

  const now = Date.now();
  const BLOCK_DURATION_MS = 60 * 60 * 1000;
  const active = merged.filter((e) => now - e.blockedAt < BLOCK_DURATION_MS);
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
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? "[]";
  let list: BlockedEntry[] = [];
  try { list = JSON.parse(raw); } catch { list = []; }
  list = list.filter((e) => e.ip !== ip);
  await updateSetting(BLOCKED_IPS_KEY, JSON.stringify(list));

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

const blockSchema = z.object({ ip: z.string().min(1), reason: z.string().optional() });

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-security", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "it" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { ip, reason = "Chặn thủ công bởi admin" } = parsed.data;
  const entry: BlockedEntry = { ip, blockedAt: Date.now(), reason };

  const settings = await getSettings();
  const raw = settings.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? "[]";
  let list: BlockedEntry[] = [];
  try { list = JSON.parse(raw); } catch { list = []; }
  list = list.filter((e) => e.ip !== ip);
  list.push(entry);
  await updateSetting(BLOCKED_IPS_KEY, JSON.stringify(list));

  await logAdminActivity({
    action: "IP_BLOCKED",
    targetType: "SECURITY",
    summary: `Chặn thủ công IP: ${ip} — ${reason}`,
  });

  return NextResponse.json({ ok: true });
}
