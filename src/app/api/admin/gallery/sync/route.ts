import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getGalleryAdmin } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif)$/i;

// POST — Quét bucket lưu trữ "gallery", thêm ảnh CHƯA có vào thư viện,
// bỏ qua ảnh đã tồn tại (so khớp theo public URL). Trả về số thêm/bỏ qua.
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-gallery-sync", limit: 6, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth();
  if (denied) return denied;

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin không khả dụng." }, { status: 500 });
  }

  // 1. URL ảnh đã có trong thư viện → set để tra nhanh.
  const existing = await getGalleryAdmin();
  const existingUrls = new Set(existing.map((g) => g.image_url));

  // 2. Liệt kê file trong bucket. Ảnh tải lên nằm ở {userId}/{file} nên duyệt
  //    cấp gốc, gặp thư mục thì liệt kê thêm 1 cấp bên trong.
  const bucket = admin.storage.from("gallery");
  const root = await bucket.list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (root.error) {
    return NextResponse.json({ error: root.error.message }, { status: 500 });
  }

  const paths: string[] = [];
  for (const entry of root.data ?? []) {
    // Thư mục có id === null trong Supabase storage list.
    if (entry.id === null) {
      const sub = await bucket.list(entry.name, { limit: 1000 });
      for (const f of sub.data ?? []) {
        if (f.id && IMAGE_RE.test(f.name)) paths.push(`${entry.name}/${f.name}`);
      }
    } else if (IMAGE_RE.test(entry.name)) {
      paths.push(entry.name);
    }
  }

  // 3. Lọc ra ảnh chưa có trong thư viện.
  const toAdd: { id: string; image_url: string; tag: string }[] = [];
  for (const path of paths) {
    const { data } = bucket.getPublicUrl(path);
    if (!existingUrls.has(data.publicUrl)) {
      toAdd.push({ id: crypto.randomUUID(), image_url: data.publicUrl, tag: "Cộng đồng" });
    }
  }

  // 4. Chèn hàng loạt (nếu có).
  let added = 0;
  if (toAdd.length > 0) {
    const { error } = await admin.from("gallery").insert(toAdd as never);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    added = toAdd.length;
  }

  await logAdminActivity({
    action: "GALLERY_SYNCED",
    targetType: "GALLERY",
    targetId: "bucket:gallery",
    summary: `Đồng bộ thư viện: +${added} ảnh mới, bỏ qua ${paths.length - added} ảnh đã có`,
  });
  revalidatePath("/gallery", "layout");

  return NextResponse.json({ added, skipped: paths.length - added, total: paths.length });
}
