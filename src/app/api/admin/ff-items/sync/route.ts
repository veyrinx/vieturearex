import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";

const BUCKET = "ff-items";
const CDN_BASE = "https://cdn.jsdelivr.net/gh/ShahGCreator/icon@main/PNG";
const BATCH_MAX = 20;

// POST { ids: string[] } — downloads from jsDelivr CDN, uploads to Supabase Storage
// Returns per-id success/fail and the public URLs.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-sync", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = await req.json().catch(() => null) as { ids?: string[]; overwrite?: boolean } | null;
  const ids = (body?.ids ?? [])
    .map((x) => String(x).trim())
    .filter((x) => /^[\w.-]{1,80}$/.test(x))
    .slice(0, BATCH_MAX);
  const overwrite = !!body?.overwrite;

  if (ids.length === 0) {
    return NextResponse.json({ error: "Cần ít nhất 1 ID" }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });

  // Ensure bucket exists (create if not)
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await db.storage.createBucket(BUCKET, { public: true });
  }

  const results: Array<{ id: string; ok: boolean; url?: string; error?: string; skipped?: boolean }> = [];

  await Promise.all(ids.map(async (id) => {
    try {
      const objectPath = `${id}.png`;

      // Check if exists (skip unless overwrite)
      if (!overwrite) {
        const { data: existing } = await db.storage.from(BUCKET).list("", { search: objectPath });
        if (existing?.some((f) => f.name === objectPath)) {
          const { data: pub } = db.storage.from(BUCKET).getPublicUrl(objectPath);
          results.push({ id, ok: true, url: pub.publicUrl, skipped: true });
          return;
        }
      }

      // Download from CDN
      const cdnRes = await fetch(`${CDN_BASE}/${encodeURIComponent(id)}.png`, {
        cache: "no-store",
      });
      if (!cdnRes.ok) {
        results.push({ id, ok: false, error: `CDN ${cdnRes.status}` });
        return;
      }

      const buffer = await cdnRes.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // Upload to Supabase Storage
      const { error: uploadErr } = await db.storage.from(BUCKET).upload(objectPath, uint8, {
        contentType: "image/png",
        upsert: true,
      });

      if (uploadErr) {
        results.push({ id, ok: false, error: uploadErr.message });
        return;
      }

      const { data: pub } = db.storage.from(BUCKET).getPublicUrl(objectPath);
      results.push({ id, ok: true, url: pub.publicUrl });
    } catch (err) {
      results.push({ id, ok: false, error: String(err).slice(0, 120) });
    }
  }));

  const successCount = results.filter((r) => r.ok).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const failedCount = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    results,
    summary: {
      total: ids.length,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
    },
  });
}
