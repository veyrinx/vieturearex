/**
 * Server-side login attempt tracker.
 * Dùng Supabase DB để persist qua restarts và share giữa instances.
 * Fallback về in-memory nếu DB không khả dụng.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const BAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const WARN_THRESHOLD = 10;
const BAN_THRESHOLD = 20;

// In-memory fallback
type AttemptRecord = {
  count: number;
  bannedUntil: number | null;
};
const memAttempts = new Map<string, AttemptRecord>();

export type LoginCheckResult =
  | { status: "ok" }
  | { status: "warn"; attemptsLeft: number }
  | { status: "banned"; bannedUntil: number };

export async function checkLoginAllowed(ip: string): Promise<LoginCheckResult> {
  if (!hasSupabaseEnv) return checkMemory(ip);

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return checkMemory(ip);

    const { data } = await (supabase as any)
      .from("login_attempts")
      .select("count, banned_until")
      .eq("ip", ip)
      .maybeSingle();

    if (!data) return { status: "ok" };

    const now = Date.now();
    if (data.banned_until && new Date(data.banned_until).getTime() > now) {
      return { status: "banned", bannedUntil: new Date(data.banned_until).getTime() };
    }

    if (data.count >= WARN_THRESHOLD) {
      return { status: "warn", attemptsLeft: BAN_THRESHOLD - data.count };
    }

    return { status: "ok" };
  } catch {
    return checkMemory(ip);
  }
}

export async function recordFailedLogin(ip: string): Promise<LoginCheckResult> {
  if (!hasSupabaseEnv) return recordMemoryFail(ip);

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return recordMemoryFail(ip);

    const { data: existing } = await (supabase as any)
      .from("login_attempts")
      .select("count, banned_until")
      .eq("ip", ip)
      .maybeSingle();

    const now = Date.now();
    const currentCount = existing?.count ?? 0;

    if (existing?.banned_until && new Date(existing.banned_until).getTime() > now) {
      return { status: "banned", bannedUntil: new Date(existing.banned_until).getTime() };
    }

    const newCount = currentCount + 1;
    const bannedUntil = newCount >= BAN_THRESHOLD
      ? new Date(now + BAN_DURATION_MS).toISOString()
      : null;

    await (supabase as any).from("login_attempts").upsert({
      ip,
      count: newCount,
      banned_until: bannedUntil,
      last_attempt: new Date().toISOString(),
    }, { onConflict: "ip" });

    if (bannedUntil) {
      return { status: "banned", bannedUntil: now + BAN_DURATION_MS };
    }

    if (newCount >= WARN_THRESHOLD) {
      return { status: "warn", attemptsLeft: BAN_THRESHOLD - newCount };
    }

    return { status: "ok" };
  } catch {
    return recordMemoryFail(ip);
  }
}

export async function resetLoginAttempts(ip: string): Promise<void> {
  memAttempts.delete(ip);

  if (!hasSupabaseEnv) return;

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return;
    await (supabase as any).from("login_attempts").delete().eq("ip", ip);
  } catch {
    // silent fail
  }
}

// In-memory fallback functions
function checkMemory(ip: string): LoginCheckResult {
  const record = memAttempts.get(ip);
  if (!record) return { status: "ok" };

  const now = Date.now();
  if (record.bannedUntil && record.bannedUntil > now) {
    return { status: "banned", bannedUntil: record.bannedUntil };
  }

  if (record.count >= WARN_THRESHOLD) {
    return { status: "warn", attemptsLeft: BAN_THRESHOLD - record.count };
  }

  return { status: "ok" };
}

function recordMemoryFail(ip: string): LoginCheckResult {
  const now = Date.now();
  const record = memAttempts.get(ip) ?? { count: 0, bannedUntil: null };

  if (record.bannedUntil && record.bannedUntil > now) {
    return { status: "banned", bannedUntil: record.bannedUntil };
  }

  record.count += 1;

  if (record.count >= BAN_THRESHOLD) {
    record.bannedUntil = now + BAN_DURATION_MS;
    memAttempts.set(ip, record);
    return { status: "banned", bannedUntil: record.bannedUntil };
  }

  memAttempts.set(ip, record);

  if (record.count >= WARN_THRESHOLD) {
    return { status: "warn", attemptsLeft: BAN_THRESHOLD - record.count };
  }

  return { status: "ok" };
}

// Legacy sync exports for backward compat
export function getLoginAttemptCount(ip: string): number {
  return memAttempts.get(ip)?.count ?? 0;
}
