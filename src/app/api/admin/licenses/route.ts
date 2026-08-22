import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getAuthContext } from "@/lib/server/auth";
import { logAdminActivity } from "@/lib/server/admin-activity";
import {
  createLicense,
  deleteLicense,
  getLicense,
  listLicenses,
  releaseActivation,
  updateLicense,
} from "@/lib/server/licenses";
import {
  LICENSE_PLANS,
  LICENSE_PRODUCTS,
  LICENSE_STATUSES,
  effectiveLicenseStatus,
  licenseDaysLeft,
  maskLicenseKey,
} from "@/lib/constants/license";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  status: z.enum([...LICENSE_STATUSES, "all"]).optional(),
  q: z.string().max(120).optional(),
});

const createSchema = z.object({
  partner_name: z.string().min(1).max(160),
  contact: z.string().max(200).optional(),
  product: z.enum(LICENSE_PRODUCTS),
  plan: z.enum(LICENSE_PLANS),
  domains: z.array(z.string().max(200)).max(50).default([]),
  features: z.array(z.string().max(60)).max(50).default([]),
  max_activations: z.number().int().min(1).max(10_000).default(1),
  expires_at: z.string().datetime().nullable().default(null),
  contract_id: z.string().uuid().nullable().optional(),
  note: z.string().max(2_000).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  partner_name: z.string().min(1).max(160).optional(),
  contact: z.string().max(200).nullable().optional(),
  product: z.enum(LICENSE_PRODUCTS).optional(),
  plan: z.enum(LICENSE_PLANS).optional(),
  domains: z.array(z.string().max(200)).max(50).optional(),
  features: z.array(z.string().max(60)).max(50).optional(),
  max_activations: z.number().int().min(1).max(10_000).optional(),
  status: z.enum(LICENSE_STATUSES).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  note: z.string().max(2_000).nullable().optional(),
});

/**
 * GET  — danh sách (mã đã che) hoặc chi tiết một giấy phép (`?id=`).
 *        `?id=…&reveal=1` mới trả mã đầy đủ, và chỉ super_admin được xem.
 * POST — cấp mã mới. Mã đầy đủ trả về ĐÚNG MỘT LẦN ở đây.
 * PATCH— sửa / tạm khoá / thu hồi / gia hạn.
 * DELETE — xoá hẳn (super_admin), hoặc gỡ một bản cài đặt (`?activation=`).
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-licenses", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const id = params.get("id");

  if (id) {
    const detail = await getLicense(id);
    if (!detail) return NextResponse.json({ error: "Không tìm thấy giấy phép." }, { status: 404 });

    // Mã đầy đủ là thứ đối tác dùng để chạy sản phẩm — không rải nó ra mọi lượt
    // mở chi tiết. Phải hỏi thẳng, và phải là super_admin.
    const reveal = params.get("reveal") === "1";
    let key = maskLicenseKey(detail.license.key);
    if (reveal) {
      const deniedReveal = await enforceAdminApiAuth({ minimumRole: "super_admin" });
      if (deniedReveal) return deniedReveal;
      key = detail.license.key;
      await logAdminActivity({
        action: "LICENSE_KEY_REVEALED",
        targetType: "LICENSE",
        targetId: id,
        summary: `Xem mã đầy đủ của giấy phép ${detail.license.partner_name}`,
      });
    }

    return NextResponse.json({
      license: {
        ...detail.license,
        key,
        revealed: reveal,
        effective_status: effectiveLicenseStatus(detail.license),
        days_left: licenseDaysLeft(detail.license.expires_at),
      },
      activations: detail.activations,
      events: detail.events,
    });
  }

  const parsed = listSchema.safeParse({
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Tham số không hợp lệ." }, { status: 400 });

  const items = await listLicenses({ status: parsed.data.status, search: parsed.data.q });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-licenses-write", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", issues: parsed.error.issues }, { status: 400 });
  }

  const auth = await getAuthContext();
  const result = await createLicense({
    partnerName: parsed.data.partner_name,
    contact: parsed.data.contact,
    product: parsed.data.product,
    plan: parsed.data.plan,
    domains: parsed.data.domains,
    features: parsed.data.features,
    maxActivations: parsed.data.max_activations,
    expiresAt: parsed.data.expires_at,
    contractId: parsed.data.contract_id ?? null,
    note: parsed.data.note,
    createdBy: auth.email ?? undefined,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });

  await logAdminActivity({
    action: "LICENSE_ISSUED",
    targetType: "LICENSE",
    targetId: result.license.id,
    summary: `Cấp giấy phép ${parsed.data.product} cho ${parsed.data.partner_name}`,
  });

  // Lần duy nhất mã đầy đủ đi ra ngoài mà không cần xin lộ mã — người cấp đang
  // đứng trước màn hình để chép nó cho đối tác.
  return NextResponse.json({ license: result.license });
}

export async function PATCH(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-licenses-write", limit: 40, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ.", issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Không có gì để sửa." }, { status: 400 });
  }

  const auth = await getAuthContext();
  const updated = await updateLicense(id, patch, auth.email ?? undefined);
  if (!updated) return NextResponse.json({ error: "Không cập nhật được." }, { status: 404 });

  await logAdminActivity({
    action: patch.status === "revoked" ? "LICENSE_REVOKED" : "LICENSE_UPDATED",
    targetType: "LICENSE",
    targetId: id,
    summary: `${patch.status === "revoked" ? "Thu hồi" : "Cập nhật"} giấy phép ${updated.partner_name}`,
  });

  return NextResponse.json({
    license: {
      ...updated,
      key: maskLicenseKey(updated.key),
      effective_status: effectiveLicenseStatus(updated),
      days_left: licenseDaysLeft(updated.expires_at),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-licenses-write", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const activationId = request.nextUrl.searchParams.get("activation");
  const auth = await getAuthContext();

  // Gỡ một bản cài đặt là việc vận hành thường ngày (đối tác đổi máy) — admin
  // làm được. Xoá hẳn giấy phép thì mất luôn nhật ký, để super_admin giữ.
  if (activationId) {
    const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
    if (denied) return denied;
    const ok = await releaseActivation(activationId, auth.email ?? undefined);
    if (!ok) return NextResponse.json({ error: "Không tìm thấy bản cài đặt." }, { status: 404 });
    await logAdminActivity({
      action: "LICENSE_ACTIVATION_RELEASED",
      targetType: "LICENSE",
      targetId: activationId,
      summary: "Gỡ một bản cài đặt khỏi giấy phép",
    });
    return NextResponse.json({ ok: true });
  }

  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  const ok = await deleteLicense(id);
  if (!ok) return NextResponse.json({ error: "Không xoá được." }, { status: 500 });

  await logAdminActivity({
    action: "LICENSE_DELETED",
    targetType: "LICENSE",
    targetId: id,
    summary: "Xoá giấy phép",
  });
  return NextResponse.json({ ok: true });
}
