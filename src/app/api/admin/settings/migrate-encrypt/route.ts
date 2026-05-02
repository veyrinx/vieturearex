import { NextRequest, NextResponse } from "next/server";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { decryptSetting, encryptSetting, isSensitiveKey } from "@/lib/server/setting-crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAdminActivity } from "@/lib/server/admin-activity";

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "settings-migrate", limit: 10, windowMs: 60_000 });
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

  const sensitive = data.filter((row) => isSensitiveKey(row.key) && row.value);

  if (sensitive.length === 0) {
    return NextResponse.json({ migrated: 0, message: "Không có dữ liệu nhạy cảm nào." });
  }

  const results = await Promise.allSettled(
    sensitive.map(async (row) => {
      const plain = await decryptSetting(row.value); // no-op if already plaintext
      const encrypted = await encryptSetting(plain);
      const { error: writeErr } = await supabase
        .from("settings")
        .update({ value: encrypted, updated_at: new Date().toISOString() } as never)
        .eq("key", row.key);
      if (writeErr) throw new Error(`${row.key}: ${(writeErr as { message: string }).message}`);
      return row.key;
    }),
  );

  const succeeded = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value);
  const failed = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown");

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: "encrypt-all",
    summary: `Mã hoá tất cả: ${succeeded.length}/${sensitive.length} keys thành công`,
  });

  return NextResponse.json({ migrated: succeeded.length, total: sensitive.length, keys: succeeded, errors: failed });
}
