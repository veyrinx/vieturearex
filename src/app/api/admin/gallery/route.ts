import { NextRequest, NextResponse } from "next/server";
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItems,
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

  const gallery = await getGalleryItems();
  return NextResponse.json({ gallery });
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

  const item = await createGalleryItem({
    image_url: parsed.data.image_url,
    tag: sanitizePlainText(parsed.data.tag),
  });

  await logAdminActivity({
    action: "GALLERY_CREATED",
    targetType: "GALLERY",
    targetId: item.id,
    summary: `Thêm ảnh gallery tag ${item.tag}`,
  });

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

  await deleteGalleryItem(payload.id);
  await logAdminActivity({
    action: "GALLERY_DELETED",
    targetType: "GALLERY",
    targetId: payload.id,
        summary: "Xóa ảnh gallery",
  });
  return NextResponse.json({ ok: true });
}
