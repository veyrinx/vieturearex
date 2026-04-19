import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getClientKey } from "@/lib/server/api-guard";
import { recordFailure } from "@/lib/server/ip-blocker";
import { updateSetting, getSettings } from "@/lib/data/content-service";

const BLOCKED_IPS_KEY = "security.blocked_ips";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "track-failure", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const ip = getClientKey(request);
  const { blocked } = recordFailure(ip);

  if (blocked) {
    // Persist to settings so admin can see and unblock
    try {
      const settings = await getSettings();
      const raw = settings.find((s) => s.key === BLOCKED_IPS_KEY)?.value ?? "[]";
      let list: Array<{ ip: string; blockedAt: number; reason: string }> = [];
      try { list = JSON.parse(raw); } catch { list = []; }

      // Remove old entry for same IP + add new
      list = list.filter((e) => e.ip !== ip);
      list.push({ ip, blockedAt: Date.now(), reason: "5 lần đăng nhập sai liên tiếp" });

      // Keep only last 200 entries
      if (list.length > 200) list = list.slice(-200);
      await updateSetting(BLOCKED_IPS_KEY, JSON.stringify(list));
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ ok: true, blocked });
}
