import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryAdmin,
} from "@/lib/data/content-service";
import { gallerySchema } from "@/lib/validators/gallery";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sanitizePlainText } from "@/lib/server/sanitize";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-gallery",
    limit: 80,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  try {
    const gallery = await getGalleryAdmin();
    return NextResponse.json({ gallery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load gallery.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-gallery",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const payload = await request.json();
  const parsed = gallerySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid gallery payload." }, { status: 400 });
  }

  let item;
  try {
    item = await createGalleryItem({
      image_url: parsed.data.image_url,
      tag: sanitizePlainText(parsed.data.tag),
    });
  } catch {
    return NextResponse.json({ error: "Không thể thêm ảnh gallery." }, { status: 500 });
  }

  await logAdminActivity({
    action: "GALLERY_CREATED",
    targetType: "GALLERY",
    targetId: item.id,
    summary: `Thêm ảnh gallery tag ${item.tag}`,
  });
  revalidatePath("/gallery", "layout");

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    name: "admin-gallery",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) {
    return limited;
  }
  const denied = await enforceAdminApiAuth();
  if (denied) {
    return denied;
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "Missing gallery id." }, { status: 400 });
  }

  try {
    await deleteGalleryItem(payload.id);
  } catch {
    return NextResponse.json({ error: "Không thể xóa ảnh gallery." }, { status: 500 });
  }
  await logAdminActivity({
    action: "GALLERY_DELETED",
    targetType: "GALLERY",
    targetId: payload.id,
    summary: "Xóa ảnh gallery",
  });
  revalidatePath("/gallery", "layout");
  return NextResponse.json({ ok: true });
}
