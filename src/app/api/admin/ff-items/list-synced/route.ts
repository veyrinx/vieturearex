import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

const BUCKET = "ff-items";

// GET — Returns all IDs currently in the ff-items bucket + bucket public URL prefix
export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-list-synced", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ ids: [], baseUrl: null });

  // Ensure bucket exists
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    return NextResponse.json({ ids: [], baseUrl: null, bucketMissing: true });
  }

  // List all objects (paginate up to 5000)
  const ids: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; offset < 5; offset++) {
    const { data, error } = await db.storage.from(BUCKET).list("", {
      limit: PAGE,
      offset: offset * PAGE,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) break;
    for (const file of data) {
      const m = file.name.match(/^(.+)\.png$/i);
      if (m && m[1]) ids.push(m[1]);
    }
    if (data.length < PAGE) break;
  }

  // Build a base URL template
  const sample = ids[0] ?? "";
  const baseUrl = sample
    ? db.storage.from(BUCKET).getPublicUrl(`${sample}.png`).data.publicUrl.replace(`${sample}.png`, "")
    : null;

  return NextResponse.json({ ids, baseUrl, count: ids.length });
}

// DELETE { ids: string[] } — Remove files from bucket
export async function DELETE(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-delete", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await req.json().catch(() => null) as { ids?: string[] } | null;
  const ids = (body?.ids ?? [])
    .map((x) => String(x).trim())
    .filter((x) => /^[\w.-]{1,80}$/.test(x))
    .slice(0, 100);

  if (ids.length === 0) return NextResponse.json({ error: "Empty" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });

  const paths = ids.map((id) => `${id}.png`);
  const { error } = await db.storage.from(BUCKET).remove(paths);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, removed: ids.length });
}
