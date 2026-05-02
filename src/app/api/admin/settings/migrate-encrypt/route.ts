import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { encryptSetting, isEncrypted, isSensitiveKey } from "@/lib/server/setting-crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "settings-migrate", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  const { data, error } = await supabase.from("settings").select("key, value") as {
    data: { key: string; value: string }[] | null;
    error: unknown;
  };
  if (error || !data) {
    return NextResponse.json({ error: "Không thể đọc settings." }, { status: 500 });
  }

  const toMigrate = data.filter(
    (row) => isSensitiveKey(row.key) && row.value && !isEncrypted(row.value),
  );

  if (toMigrate.length === 0) {
    return NextResponse.json({ migrated: 0, message: "Tất cả đã được mã hoá." });
  }

  const results = await Promise.allSettled(
    toMigrate.map(async (row) => {
      const encrypted = await encryptSetting(row.value);
      const { error: writeErr } = await supabase
        .from("settings")
        .update({ value: encrypted, updated_at: new Date().toISOString() } as never)
        .eq("key", row.key);
      if (writeErr) throw new Error(`${row.key}: ${(writeErr as { message: string }).message}`);
      return row.key;
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<string>).value);
  const failed = results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown");

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: "migrate-encrypt",
    summary: `Mã hoá ${succeeded.length}/${toMigrate.length} sensitive settings: ${succeeded.join(", ")}`,
  });

  return NextResponse.json({ migrated: succeeded.length, keys: succeeded, errors: failed });
}
