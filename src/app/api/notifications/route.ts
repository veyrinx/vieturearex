import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/api-guard";
import {
  getUserNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from "@/lib/server/notifications";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "notifications", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("count") === "true") {
    const count = await getUnreadCount(auth.userId).catch(() => 0);
    return NextResponse.json({ count });
  }

  const notifications = await getUserNotifications(auth.userId).catch(() => []);
  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "notifications-patch", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };

  if (body.all) {
    await markAllRead(auth.userId);
  } else if (body.id) {
    await markRead(body.id, auth.userId);
  }

  return NextResponse.json({ ok: true });
}
