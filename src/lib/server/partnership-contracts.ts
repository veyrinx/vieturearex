import "server-only";
import crypto from "node:crypto";
import { getSettings, updateSetting } from "@/lib/data/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  buildContractDocument,
  contractToPlainText,
  parsePartyA,
  recordToInput,
  serializePartyA,
  vnIsoDate,
  CONTRACT_TERMS_VERSION,
  SETTINGS_KEY_PARTY_A,
  type ContractDocument,
  type ContractEventKind,
  type ContractRecord,
  type ContractStatus,
  type PartyA,
} from "@/lib/constants/partnership-contract";

// ── Bên A ────────────────────────────────────────────────────────────────────

export async function getPartyA(): Promise<PartyA> {
  try {
    const settings = await getSettings();
    return parsePartyA(settings.find((s) => s.key === SETTINGS_KEY_PARTY_A)?.value ?? null);
  } catch {
    return parsePartyA(null);
  }
}

export async function savePartyA(party: PartyA) {
  await updateSetting(SETTINGS_KEY_PARTY_A, serializePartyA(party));
}

// ── Bằng chứng toàn vẹn ──────────────────────────────────────────────────────

/** SHA-256 của toàn văn điều khoản. Đối tác đối chiếu được bằng công cụ bất kỳ. */
export function hashTerms(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** Token để Bên B mở lại hợp đồng bằng link — họ có thể không có tài khoản site. */
export function newAccessToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** So sánh token không rò rỉ thời gian. */
export function tokenMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Truy vấn ─────────────────────────────────────────────────────────────────

const SELECT_ALL = "*";

/** Bản gửi ra ngoài — bỏ access_token để không lộ qua API quản trị/trang xem. */
export function stripSecrets<T extends { access_token?: string }>(row: T): Omit<T, "access_token"> {
  const { access_token: _token, ...rest } = row;
  return rest;
}

export async function listContracts(options?: {
  status?: ContractStatus | "all";
  limit?: number;
}): Promise<ContractRecord[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];

  let query = untypedFrom(db, "partnership_contracts")
    .select(SELECT_ALL)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) return [];
  return ((data ?? []) as unknown as Array<ContractRecord & { access_token: string }>).map(stripSecrets) as ContractRecord[];
}

export async function getContractById(id: string): Promise<(ContractRecord & { access_token: string }) | null> {
  const db = createAdminSupabaseClient();
  if (!db) return null;
  const { data } = await untypedFrom(db, "partnership_contracts")
    .select(SELECT_ALL)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as (ContractRecord & { access_token: string }) | null) ?? null;
}

/**
 * Bên B mở lại hợp đồng bằng link: cần đúng cả id lẫn token. Không có token thì
 * coi như không tìm thấy — hợp đồng có CCCD, địa chỉ, chữ ký nên không đoán mò được.
 */
export async function getContractByToken(id: string, token: string): Promise<ContractRecord | null> {
  if (!token) return null;
  const row = await getContractById(id);
  if (!row) return null;
  if (!tokenMatches(row.access_token ?? "", token)) return null;
  return stripSecrets(row) as ContractRecord;
}

export async function insertContract(
  values: Record<string, unknown>,
): Promise<{ row: (ContractRecord & { access_token: string }) | null; error: string | null }> {
  const db = createAdminSupabaseClient();
  if (!db) return { row: null, error: "DB unavailable" };

  const { data, error } = await untypedFrom(db, "partnership_contracts")
    .insert(values as never)
    .select(SELECT_ALL)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as unknown as ContractRecord & { access_token: string }, error: null };
}

export async function updateContract(
  id: string,
  patch: Record<string, unknown>,
): Promise<{ row: ContractRecord | null; error: string | null }> {
  const db = createAdminSupabaseClient();
  if (!db) return { row: null, error: "DB unavailable" };

  const { data, error } = await untypedFrom(db, "partnership_contracts")
    .update(patch as never)
    .eq("id", id)
    .select(SELECT_ALL)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: stripSecrets(data as unknown as ContractRecord & { access_token: string }) as ContractRecord, error: null };
}

// ── Nhật ký ──────────────────────────────────────────────────────────────────

export type ContractEvent = {
  id: string;
  contract_id: string;
  event: ContractEventKind;
  actor: string | null;
  detail: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function logContractEvent(input: {
  contractId: string;
  event: ContractEventKind;
  actor?: string | null;
  detail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = createAdminSupabaseClient();
  if (!db) return;
  await untypedFrom(db, "partnership_contract_events")
    .insert({
      contract_id: input.contractId,
      event: input.event,
      actor: input.actor ?? null,
      detail: input.detail ?? null,
      ip: input.ip ?? null,
      user_agent: input.userAgent?.slice(0, 400) ?? null,
    } as never)
    .then(
      () => undefined,
      () => undefined,
    );
}

export async function listContractEvents(contractId: string): Promise<ContractEvent[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  const { data } = await untypedFrom(db, "partnership_contract_events")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as ContractEvent[];
}

/**
 * Hợp đồng đã ký mà quá term_end thì chuyển sang 'expired'. Gọi khi admin mở
 * bảng quản trị — rẻ hơn dựng cron riêng, và Vercel Hobby chỉ cho 1 cron/ngày.
 */
export async function expireOverdueContracts(): Promise<number> {
  const db = createAdminSupabaseClient();
  if (!db) return 0;
  const todayVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await untypedFrom(db, "partnership_contracts")
    .update({ status: "expired" } as never)
    .eq("status", "signed")
    .lt("term_end", todayVN)
    .select("id");
  if (error) return 0;
  const rows = (data ?? []) as unknown as Array<{ id: string }>;
  await Promise.all(
    rows.map((r) =>
      logContractEvent({ contractId: r.id, event: "expired", actor: "system", detail: "Quá ngày kết thúc hợp tác" }),
    ),
  );
  return rows.length;
}

// ── Dựng lại bản đã ký ───────────────────────────────────────────────────────

export type RenderedContract = {
  /** Dựng lại được và băm khớp → hiển thị bản trình bày đẹp. */
  doc: ContractDocument | null;
  /** Băm của bản dựng lại có khớp terms_hash đã lưu không. */
  hashOk: boolean;
  /** Toàn văn đã lưu — luôn có, dùng làm bản gốc khi không dựng lại được. */
  rawText: string;
  hash: string;
};

/**
 * Bản lưu (`terms_text` + `terms_hash`) mới là bản có giá trị pháp lý. Ở đây ta
 * dựng lại văn bản từ dữ liệu để trình bày cho đẹp, RỒI đối chiếu băm: khớp thì
 * hiện bản đẹp, lệch (thường vì mẫu điều khoản đã đổi phiên bản) thì hiện đúng
 * toàn văn đã lưu, không tô vẽ gì thêm.
 */
export function renderStoredContract(row: ContractRecord): RenderedContract {
  const rawText = row.terms_text ?? "";
  const hash = row.terms_hash ?? "";

  if (row.terms_version !== CONTRACT_TERMS_VERSION) {
    return { doc: null, hashOk: false, rawText, hash };
  }

  const partyA = row.party_a ?? parsePartyA(null);
  const doc = buildContractDocument(recordToInput(row), partyA, {
    code: row.code,
    signDate: vnIsoDate(row.b_signed_at) || row.term_start,
  });
  const hashOk = hashTerms(contractToPlainText(doc)) === hash;
  return { doc: hashOk ? doc : null, hashOk, rawText, hash };
}
