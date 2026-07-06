import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { getSettings } from "@/lib/data/content-service";

const SETTING_ENABLED = "cron.purge_expired_events_enabled";
const SETTING_GRACE_DAYS = "cron.purge_expired_events_grace_days";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ok: false, reason: "db_unavailable" });

  const settings = await getSettings().catch(() => [] as Awaited<ReturnType<typeof getSettings>>);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  
  const enabled = map[SETTING_ENABLED] !== "false";
  if (!enabled) return NextResponse.json({ ok: true, skipped: "disabled" });

  const graceRaw = parseInt(map[SETTING_GRACE_DAYS] ?? "", 10);
  const graceDays = Number.isFinite(graceRaw) && graceRaw > 0 ? graceRaw : 0;
  const cutoff = new Date(Date.now() - graceDays * 86_400_000).toISOString();

  let deleted = 0;
  try {
    const { data, error } = await untypedFrom(db, "events")
      .delete()
      .lt("end_date", cutoff)
      .select("id") as { data: Array<{ id: string }> | null; error: unknown };
    if (error) {
      console.error("[cron purge-expired] delete failed:", error);
      return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
    deleted = data?.length ?? 0;
  } catch (e) {
    console.error("[cron purge-expired] threw:", e);
    return NextResponse.json({ ok: false, error: "exception" }, { status: 500 });
  }

  if (deleted > 0) {
    revalidatePath("/", "layout");
    revalidatePath("/events", "layout");
    revalidatePath("/calendar", "layout");
  }

  return NextResponse.json({ ok: true, deleted, graceDays });
}
