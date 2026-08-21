import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { clientNetInfo } from "@/lib/server/client-net";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { siteConfig } from "@/lib/constants/site";
import { PARTNER_TIERS, TIER_LABEL } from "@/lib/constants/partners";
import {
  buildContractDocument,
  contractToPlainText,
  isMinor,
  CONTRACT_TERMS_VERSION,
  PARTY_TYPES,
  type ContractInput,
} from "@/lib/constants/partnership-contract";
import {
  getPartyA,
  hashTerms,
  insertContract,
  logContractEvent,
  newAccessToken,
  updateContract,
} from "@/lib/server/partnership-contracts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (max: number) =>
  z.string().max(max).optional().default("").transform((v) => v.trim());
const required = (min: number, max: number) => z.string().trim().min(min).max(max);
const date = z.string().regex(ISO_DATE, "Ngày không hợp lệ");
const optionalDate = z
  .string()
  .max(10)
  .optional()
  .default("")
  .transform((v) => v.trim())
  .refine((v) => v === "" || ISO_DATE.test(v), "Ngày không hợp lệ");

// Chữ ký là ảnh PNG do canvas xuất ra. Chặn ~300KB: nét vẽ tay thật chỉ vài chục KB,
// to hơn nữa là ai đó đang nhét ảnh khác vào.
const signature = z
  .string()
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Chữ ký không hợp lệ")
  .max(300_000);

const schema = z.object({
  party_type: z.enum(PARTY_TYPES),
  full_name: required(2, 100),
  date_of_birth: optionalDate,
  id_number: required(6, 20),
  id_issued_date: optionalDate,
  id_issued_by: text(150),
  address: required(5, 250),
  phone: required(8, 20),
  email: z.string().trim().email().max(150),

  org_name: text(150),
  org_tax_code: text(30),
  org_reg_no: text(50),
  rep_title: text(100),

  guardian_name: text(100),
  guardian_relation: text(50),
  guardian_id_number: text(20),
  guardian_phone: text(20),

  tier: z.enum(PARTNER_TIERS),
  scope: required(20, 2000),
  channels: text(500),
  term_start: date,
  term_end: date,
  consideration: text(1000),
  payment_terms: text(1000),

  b_signature: signature,
  b_signed_name: required(2, 100),

  consent_terms: z.literal(true),
  consent_privacy: z.literal(true),
  consent_esign: z.literal(true),
});

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  // Ký hợp đồng là việc hiếm — 3 lần/ngày/IP là quá đủ cho cả sửa sai.
  const limited = enforceRateLimit(request, { name: "partnership-contract", limit: 3, windowMs: 86_400_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // ── Kiểm tra ràng buộc pháp lý mà zod không nói hộ được ────────────────────
  if (d.term_end <= d.term_start) return fail("Ngày kết thúc phải sau ngày bắt đầu.");

  const todayVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (d.term_end < todayVN) return fail("Thời hạn hợp tác đã kết thúc trong quá khứ.");

  if (d.party_type === "organization" && !d.org_name) {
    return fail("Bên B là tổ chức thì phải điền tên tổ chức.");
  }

  if (!d.date_of_birth) {
    return fail("Vui lòng điền ngày sinh của người ký — hợp đồng cần xác định năng lực hành vi dân sự.");
  }

  // Chưa đủ 18 tuổi: bắt buộc có người đại diện theo pháp luật (Điều 21 BLDS 2015).
  const minor = isMinor(d.date_of_birth);
  if (minor && (!d.guardian_name || !d.guardian_id_number || !d.guardian_phone || !d.guardian_relation)) {
    return fail(
      "Người ký chưa đủ 18 tuổi. Theo Điều 21 Bộ luật Dân sự 2015, cần điền đầy đủ thông tin người đại diện theo pháp luật.",
    );
  }

  // Gõ lại họ tên phải khớp họ tên khai — đây là phần "xác nhận ý chí" của chữ ký.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  if (norm(d.b_signed_name) !== norm(d.full_name)) {
    return fail("Họ tên xác nhận ở ô ký phải trùng khớp với họ tên người ký đã khai.");
  }

  // ── Dựng toàn văn + băm ────────────────────────────────────────────────────
  const partyA = await getPartyA();

  const input: ContractInput = {
    party_type: d.party_type,
    full_name: d.full_name,
    date_of_birth: d.date_of_birth,
    id_number: d.id_number,
    id_issued_date: d.id_issued_date,
    id_issued_by: d.id_issued_by,
    address: d.address,
    phone: d.phone,
    email: d.email,
    org_name: d.org_name,
    org_tax_code: d.org_tax_code,
    org_reg_no: d.org_reg_no,
    rep_title: d.rep_title,
    guardian_name: d.guardian_name,
    guardian_relation: d.guardian_relation,
    guardian_id_number: d.guardian_id_number,
    guardian_phone: d.guardian_phone,
    tier: d.tier,
    scope: d.scope,
    channels: d.channels,
    term_start: d.term_start,
    term_end: d.term_end,
    consideration: d.consideration,
    payment_terms: d.payment_terms,
  };

  // Số hợp đồng do DB cấp (sequence). Toàn văn chụp lúc này chưa có số nên chừa
  // chỗ, rồi băm lại sau khi insert xong — xem bước cập nhật bên dưới.
  const draftDoc = buildContractDocument(input, partyA, { code: "(cấp khi lưu)", signDate: todayVN });
  const draftText = contractToPlainText(draftDoc);

  const net = clientNetInfo(request);

  // Có phiên đăng nhập thì gắn luôn, để đối tác xem lại hợp đồng trong tài khoản.
  let userId: string | null = null;
  try {
    const supabase = createServerSupabaseClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    userId = data?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const accessToken = newAccessToken();

  const { row, error } = await insertContract({
    ...input,
    date_of_birth: d.date_of_birth || null,
    id_issued_date: d.id_issued_date || null,
    status: "pending",
    party_a: partyA,
    terms_version: CONTRACT_TERMS_VERSION,
    terms_text: draftText,
    terms_hash: hashTerms(draftText),
    b_signature: d.b_signature,
    b_signed_name: d.b_signed_name,
    b_signed_at: new Date().toISOString(),
    b_sign_ip: net.ip,
    b_sign_device: net.device,
    b_sign_browser: net.browser,
    consent_terms: true,
    consent_privacy: true,
    consent_esign: true,
    access_token: accessToken,
    user_id: userId,
  });

  if (error || !row) {
    return NextResponse.json({ error: "Không lưu được hợp đồng. Vui lòng thử lại." }, { status: 500 });
  }

  // Giờ đã có số hợp đồng thật → chụp lại toàn văn kèm số và băm lại. Bản lưu
  // cuối cùng mới là bản dùng để đối chiếu, nên hash phải khớp với nó.
  const finalDoc = buildContractDocument(input, partyA, { code: row.code, signDate: todayVN });
  const finalText = contractToPlainText(finalDoc);
  const finalHash = hashTerms(finalText);

  await updateContract(row.id, { terms_text: finalText, terms_hash: finalHash });

  await logContractEvent({
    contractId: row.id,
    event: "created",
    actor: "Bên B",
    detail: `${d.full_name} — gói ${TIER_LABEL[d.tier]}`,
    ip: net.ip,
    userAgent: net.ua,
  });
  await logContractEvent({
    contractId: row.id,
    event: "signed_b",
    actor: d.b_signed_name,
    detail: `SHA-256: ${finalHash.slice(0, 16)}…`,
    ip: net.ip,
    userAgent: net.ua,
  });

  const viewUrl = `${siteConfig.url}/partnership/hop-dong/${row.id}?token=${accessToken}`;

  void sendTelegramNotification({
    title: "Hợp đồng hợp tác mới chờ ký",
    subtitle: `${row.code} · ${TIER_LABEL[d.tier]}`,
    sections: [
      {
        heading: "Bên B",
        rows: [
          { label: "Người ký", value: d.full_name, bold: true },
          { label: "Tư cách", value: d.party_type === "organization" ? d.org_name || "Tổ chức" : "Cá nhân" },
          { label: "Điện thoại", value: d.phone, mono: true },
          { label: "Email", value: d.email, mono: true },
          ...(minor ? [{ label: "Người đại diện", value: `${d.guardian_name} (${d.guardian_relation})`, status: "warn" as const }] : []),
        ],
      },
      {
        heading: "Nội dung",
        rows: [
          { label: "Thời hạn", value: `${d.term_start} → ${d.term_end}` },
          { label: "Giá trị", value: d.consideration || "Trao đổi quyền lợi" },
          { label: "Ký lúc", value: vnNow() },
          { label: "IP", value: net.ip, mono: true },
        ],
      },
    ],
    actions: [{ label: "Duyệt & ký", url: `${siteConfig.url}/admin/partnership-contracts` }],
  });

  return NextResponse.json(
    { ok: true, id: row.id, code: row.code, token: accessToken, url: viewUrl },
    { status: 201 },
  );
}
