import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { updateSetting, getSettings } from "@/lib/data/content-service";

const PUSH_SUBS_KEY = "push.subscriptions";

async function getStoredSubs(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === PUSH_SUBS_KEY)?.value;
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-subscribe", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const sub = await request.json().catch(() => null);
  if (!sub?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const subStr = JSON.stringify(sub);
  const current = await getStoredSubs();
  if (!current.includes(subStr)) {
    await updateSetting(PUSH_SUBS_KEY, JSON.stringify([...current, subStr]));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-subscribe", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const sub = await request.json().catch(() => null);
  if (!sub?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const subStr = JSON.stringify(sub);
  const current = await getStoredSubs();
  await updateSetting(PUSH_SUBS_KEY, JSON.stringify(current.filter((s) => s !== subStr)));

  return NextResponse.json({ ok: true });
}
