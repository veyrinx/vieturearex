import "server-only";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  domainAllowed,
  effectiveLicenseStatus,
  formatLicenseKey,
  licenseChecksum,
  licenseDaysLeft,
  maskLicenseKey,
  normalizeDomain,
  normalizeLicenseKey,
  LICENSE_ALPHABET,
  type LicenseActivation,
  type LicenseEvent,
  type LicenseListItem,
  type LicensePlan,
  type LicenseProduct,
  type LicenseRecord,
  type LicenseStatus,
} from "@/lib/constants/license";

// ── Sinh mã ──────────────────────────────────────────────────────────────────

/**
 * 15 ký tự ngẫu nhiên từ bảng chữ Crockford + 4 ký tự kiểm tra.
 *
 * Lấy byte rồi loại thẳng những byte >= 256 - (256 % 32) thay vì `% 32`: chia
 * dư trên 256 không chia hết cho 32 sẽ làm vài ký tự đầu bảng xuất hiện nhiều
 * hơn. Với 15 ký tự thì lệch đó vô hại, nhưng mã bản quyền là thứ không nên
 * đoán được — cứ lấy đúng phân phối đều cho xong chuyện.
 */
export function generateLicenseKey(): string {
  const limit = 256 - (256 % LICENSE_ALPHABET.length);
  let payload = "";
  while (payload.length < 15) {
    for (const byte of crypto.randomBytes(24)) {
      if (byte >= limit) continue;
      payload += LICENSE_ALPHABET[byte % LICENSE_ALPHABET.length];
      if (payload.length === 15) break;
    }
  }
  return formatLicenseKey(payload + licenseChecksum(payload));
}

// ── Chuyển đổi ───────────────────────────────────────────────────────────────

type RowWithCount = LicenseRecord & { license_activations?: Array<{ count: number }> };

/** Bản gửi ra ngoài: mã đã che + trạng thái/hạn đã tính sẵn cho giao diện. */
export function toListItem(row: RowWithCount, now = new Date()): LicenseListItem {
  const { key, license_activations: counts, ...rest } = row;
  return {
    ...rest,
    key_masked: maskLicenseKey(key),
    effective_status: effectiveLicenseStatus(row, now),
    days_left: licenseDaysLeft(row.expires_at, now),
    activation_count: counts?.[0]?.count ?? 0,
  };
}

// ── Nhật ký ──────────────────────────────────────────────────────────────────

export async function logLicenseEvent(input: {
  licenseId: string | null;
  event: string;
  detail?: string;
  ip?: string;
  actor?: string;
}): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;
  await untypedFrom(db, "license_events")
    .insert({
      license_id: input.licenseId,
      event: input.event,
      detail: input.detail ?? null,
      ip: input.ip ?? null,
      actor: input.actor ?? null,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

// ── Đọc ──────────────────────────────────────────────────────────────────────

export async function listLicenses(options?: {
  status?: LicenseStatus | "all";
  search?: string;
  limit?: number;
}): Promise<LicenseListItem[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  const build = (select: string) => {
    let query = untypedFrom(db, "licenses")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 200);
    if (options?.status && options.status !== "all") query = query.eq("status", options.status);
    if (options?.search) query = query.ilike("partner_name", `%${options.search}%`);
    return query as unknown as Promise<{ data: RowWithCount[] | null; error: unknown }>;
  };

  // Đếm bản cài đặt bằng embed của PostgREST cho gọn một lượt gọi. Embed phụ
  // thuộc vào khoá ngoại được nhận diện đúng — chưa chạy migration hoặc schema
  // cache còn cũ là câu này hỏng. Hỏng thì lấy danh sách trơn, thà thiếu con số
  // đếm còn hơn trang quản trị trống trơn không nói vì sao.
  let { data, error } = await build("*, license_activations(count)");
  if (error) ({ data, error } = await build("*"));
  if (error || !data) return [];

  const now = new Date();
  return data.map((row) => toListItem(row, now));
}

/** Chi tiết một giấy phép — kèm mã đầy đủ, chỉ gọi từ route đã chặn quyền. */
export async function getLicense(id: string): Promise<{
  license: LicenseRecord;
  activations: LicenseActivation[];
  events: LicenseEvent[];
} | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const { data } = (await untypedFrom(db, "licenses").select("*").eq("id", id).maybeSingle()) as {
    data: LicenseRecord | null;
  };
  if (!data) return null;

  const [{ data: activations }, { data: events }] = await Promise.all([
    untypedFrom(db, "license_activations")
      .select("*")
      .eq("license_id", id)
      .order("last_seen_at", { ascending: false })
      .limit(100) as unknown as Promise<{ data: LicenseActivation[] | null }>,
    untypedFrom(db, "license_events")
      .select("*")
      .eq("license_id", id)
      .order("created_at", { ascending: false })
      .limit(50) as unknown as Promise<{ data: LicenseEvent[] | null }>,
  ]);

  return { license: data, activations: activations ?? [], events: events ?? [] };
}

// ── Ghi ──────────────────────────────────────────────────────────────────────

export type CreateLicenseInput = {
  partnerName: string;
  contact?: string;
  product: LicenseProduct;
  plan: LicensePlan;
  domains: string[];
  features: string[];
  maxActivations: number;
  expiresAt: string | null;
  contractId?: string | null;
  note?: string;
  createdBy?: string;
};

export async function createLicense(
  input: CreateLicenseInput,
): Promise<{ license: LicenseRecord } | { error: string }> {
  const db = createAdminSupabaseClient();
  if (!db) return { error: "Không kết nối được cơ sở dữ liệu." };

  // Trùng mã gần như không thể (32^15), nhưng đã có ràng buộc unique thì thử
  // lại vài lượt vẫn hơn là ném lỗi 500 vào mặt người cấp mã.
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateLicenseKey();
    const { data, error } = (await untypedFrom(db, "licenses")
      .insert({
        key,
        partner_name: input.partnerName,
        contact: input.contact || null,
        product: input.product,
        plan: input.plan,
        domains: input.domains.map(normalizeDomain).filter(Boolean),
        features: input.features,
        max_activations: input.maxActivations,
        expires_at: input.expiresAt,
        contract_id: input.contractId || null,
        note: input.note || null,
        created_by: input.createdBy || null,
      })
      .select("*")
      .maybeSingle()) as { data: LicenseRecord | null; error: { code?: string; message?: string } | null };

    if (data) {
      await logLicenseEvent({
        licenseId: data.id,
        event: "issued",
        detail: `${input.partnerName} — ${input.product}/${input.plan}`,
        actor: input.createdBy,
      });
      return { license: data };
    }
    if (error?.code !== "23505") return { error: error?.message ?? "Không tạo được giấy phép." };
  }
  return { error: "Sinh mã trùng liên tục — thử lại." };
}

export type UpdateLicensePatch = {
  partner_name?: string;
  contact?: string | null;
  product?: LicenseProduct;
  plan?: LicensePlan;
  domains?: string[];
  features?: string[];
  max_activations?: number;
  status?: LicenseStatus;
  expires_at?: string | null;
  contract_id?: string | null;
  note?: string | null;
};

export async function updateLicense(
  id: string,
  patch: UpdateLicensePatch,
  actor?: string,
): Promise<LicenseRecord | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;

  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (patch.domains) payload.domains = patch.domains.map(normalizeDomain).filter(Boolean);

  const { data } = (await untypedFrom(db, "licenses")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle()) as { data: LicenseRecord | null };

  if (data) {
    const what = patch.status
      ? `status → ${patch.status}`
      : patch.expires_at !== undefined
        ? `hạn → ${patch.expires_at ?? "vĩnh viễn"}`
        : Object.keys(patch).join(", ");
    await logLicenseEvent({ licenseId: id, event: "updated", detail: what, actor });
  }
  return data;
}

export async function deleteLicense(id: string): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;
  const { error } = await untypedFrom(db, "licenses").delete().eq("id", id);
  return !error;
}

/** Gỡ một bản cài đặt để đối tác chuyển máy/tên miền mà không cần cấp mã mới. */
export async function releaseActivation(activationId: string, actor?: string): Promise<boolean> {
  const db = createAdminSupabaseClient();
  if (!db) return false;
  const { data } = (await untypedFrom(db, "license_activations")
    .delete()
    .eq("id", activationId)
    .select("license_id, instance_id")
    .maybeSingle()) as { data: { license_id: string; instance_id: string } | null };
  if (!data) return false;
  await logLicenseEvent({
    licenseId: data.license_id,
    event: "activation_released",
    detail: data.instance_id,
    actor,
  });
  return true;
}

// ── Xác thực ─────────────────────────────────────────────────────────────────

export type VerifyInput = {
  key: string;
  domain?: string;
  instanceId?: string;
  appVersion?: string;
  product?: string;
  ip?: string;
  userAgent?: string;
};

export type VerifyResult =
  | {
      valid: true;
      license: {
        partner: string;
        product: LicenseProduct;
        plan: LicensePlan;
        features: string[];
        issued_at: string;
        expires_at: string | null;
        days_left: number | null;
        activations: { used: number; max: number };
      };
    }
  | { valid: false; reason: string };

/**
 * Một lượt xác thực từ máy đối tác. Trả lý do cụ thể khi từ chối — người tích
 * hợp cần biết "sai tên miền" khác "hết hạn", chứ nhận về đúng chữ `false` thì
 * họ chỉ còn nước nhắn tin hỏi.
 *
 * Mọi lần từ chối của một mã CÓ THẬT đều ghi vào license_events: mã bị chia sẻ
 * ra ngoài luôn lộ ra ở đây trước khi lộ ở chỗ khác.
 */
export async function verifyLicense(input: VerifyInput): Promise<VerifyResult> {
  const key = normalizeLicenseKey(input.key);
  if (!key) return { valid: false, reason: "malformed" };

  const db = createAdminSupabaseClient();
  if (!db) return { valid: false, reason: "unavailable" };

  const { data: license } = (await untypedFrom(db, "licenses")
    .select("*")
    .eq("key", key)
    .maybeSingle()) as { data: LicenseRecord | null };

  // Mã không tồn tại thì KHÔNG ghi nhật ký: quét mò sẽ bơm đầy bảng. Chặn quét
  // là việc của rate limit ở route.
  if (!license) return { valid: false, reason: "not_found" };

  const deny = async (reason: string, detail?: string): Promise<VerifyResult> => {
    await logLicenseEvent({
      licenseId: license.id,
      event: `verify_denied:${reason}`,
      detail,
      ip: input.ip,
    });
    return { valid: false, reason };
  };

  const status = effectiveLicenseStatus(license);
  if (status !== "active") return deny(status);

  if (input.product && input.product !== license.product) {
    return deny("product_mismatch", input.product);
  }

  if (input.domain && !domainAllowed(license.domains, input.domain)) {
    return deny("domain_mismatch", normalizeDomain(input.domain));
  }

  // Đếm bản cài đặt. Không có instance_id thì bỏ qua bước này — máy khách cũ
  // vẫn xác thực được, chỉ là không đếm được chỗ dùng.
  let used = 0;
  if (input.instanceId) {
    const { count } = (await untypedFrom(db, "license_activations")
      .select("id", { count: "exact", head: true })
      .eq("license_id", license.id)) as unknown as { count: number | null };
    used = count ?? 0;

    const { data: existing } = (await untypedFrom(db, "license_activations")
      .select("id, verify_count")
      .eq("license_id", license.id)
      .eq("instance_id", input.instanceId)
      .maybeSingle()) as { data: { id: string; verify_count: number } | null };

    if (!existing) {
      if (used >= license.max_activations) {
        return deny("activation_limit", `${used}/${license.max_activations}`);
      }
      await untypedFrom(db, "license_activations").insert({
        license_id: license.id,
        instance_id: input.instanceId,
        domain: input.domain ? normalizeDomain(input.domain) : null,
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
        app_version: input.appVersion ?? null,
      });
      used += 1;
      await logLicenseEvent({
        licenseId: license.id,
        event: "activation_new",
        detail: `${input.instanceId}${input.domain ? ` @ ${normalizeDomain(input.domain)}` : ""}`,
        ip: input.ip,
      });
    } else {
      await untypedFrom(db, "license_activations")
        .update({
          last_seen_at: new Date().toISOString(),
          verify_count: existing.verify_count + 1,
          domain: input.domain ? normalizeDomain(input.domain) : null,
          ip: input.ip ?? null,
          app_version: input.appVersion ?? null,
        })
        .eq("id", existing.id);
    }
  }

  await untypedFrom(db, "licenses")
    .update({
      last_verified_at: new Date().toISOString(),
      verify_count: license.verify_count + 1,
    })
    .eq("id", license.id);

  return {
    valid: true,
    license: {
      partner: license.partner_name,
      product: license.product,
      plan: license.plan,
      features: license.features ?? [],
      issued_at: license.issued_at,
      expires_at: license.expires_at,
      days_left: licenseDaysLeft(license.expires_at),
      activations: { used, max: license.max_activations },
    },
  };
}
