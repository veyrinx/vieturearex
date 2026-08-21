import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { clientNetInfo } from "@/lib/server/client-net";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { siteConfig } from "@/lib/constants/site";
import { PARTNER_TIERS, TIER_LABEL } from "@/lib/constants/partners";
import { normalizeDuties } from "@/lib/constants/team-duties";
import { IP_OWNERSHIP_OPTIONS } from "@/lib/constants/partnership";
import {
  buildContractDocument,
  contractToPlainText,
  isMinor,
  normalizeExtraTerms,
  partyBName,
  partyTypeFor,
  CONTRACT_KINDS,
  CONTRACT_TERMS_VERSION,
  EXTRA_TERMS_MAX,
  EXTRA_TERM_BODY_MAX,
  EXTRA_TERM_TITLE_MAX,
  KIND_LABEL,
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
  kind: z.enum(CONTRACT_KINDS),
  party_type: z.enum(PARTY_TYPES),

  full_name: required(2, 100),
  display_name: text(60),
  date_of_birth: optionalDate,
  game_uid: text(20),
  email: z.string().trim().email().max(150),
  phone: text(20),
  contact_link: required(3, 200),
  area: text(120),

  team_name: text(120),
  team_tag: text(20),
  team_size: text(60),
  rep_title: text(80),
  channels: text(500),

  guardian_name: text(100),
  guardian_relation: text(50),
  guardian_phone: text(20),

  tier: z.enum(PARTNER_TIERS),
  member_role: text(100),
  duties: z.array(z.string().max(60)).max(12).optional().default([]),
  commitment: text(500),
  deliverables: text(1000),
  sla: text(500),
  ip_ownership: z.enum(IP_OWNERSHIP_OPTIONS),

  scope: required(20, 2000),
  term_start: date,
  term_end: date,
  consideration: text(1000),
  payment_terms: text(1000),

  extra_terms: z
    .array(z.object({ title: z.string().max(EXTRA_TERM_TITLE_MAX), body: z.string().max(EXTRA_TERM_BODY_MAX) }))
    .max(EXTRA_TERMS_MAX)
    .optional()
    .default([]),

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

  // Tư cách Bên B do hình thức quyết định — client gửi gì cũng chuẩn hóa lại.
  const partyType = partyTypeFor(d.kind, d.party_type);
  const asTeam = partyType === "team";

  // ── Ràng buộc theo hình thức mà zod không nói hộ được ──────────────────────
  if (d.term_end <= d.term_start) return fail("Ngày kết thúc phải sau ngày bắt đầu.");

  const todayVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (d.term_end < todayVN) return fail("Thời hạn hợp tác đã kết thúc trong quá khứ.");

  if (asTeam) {
    if (!d.team_name) return fail("Bên B là đội, nhóm thì phải điền tên đội.");
    if (!d.rep_title) return fail("Điền vai trò của người ký trong đội (đội trưởng, quản lý…).");
  } else if (!d.display_name) {
    return fail("Điền biệt danh hoặc tên bạn dùng trong cộng đồng.");
  }

  if (d.kind === "member") {
    if (!d.member_role) return fail("Điền vai trò bạn tham gia đội ngũ.");
    if (!d.date_of_birth) return fail("Điền ngày sinh — đội ngũ cần biết để giao việc đúng độ tuổi.");
    if (d.game_uid && !/^\d{6,15}$/.test(d.game_uid)) return fail("UID Free Fire chỉ gồm chữ số.");
  }

  if (d.kind === "tech" && !d.deliverables) {
    return fail("Ghi rõ sản phẩm bàn giao và mốc thời gian của hạng mục kỹ thuật.");
  }

  // Chưa đủ 18 tuổi: bắt buộc có người đại diện theo pháp luật (Điều 21 BLDS 2015).
  const minor = isMinor(d.date_of_birth);
  if (minor && (!d.guardian_name || !d.guardian_relation || !d.guardian_phone)) {
    return fail(
      "Người ký chưa đủ 18 tuổi. Theo Điều 21 Bộ luật Dân sự 2015, cần điền họ tên, quan hệ và số liên lạc của người đại diện theo pháp luật.",
    );
  }

  // Gõ lại họ tên phải khớp họ tên khai — đây là phần "xác nhận ý chí" của chữ ký.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  if (norm(d.b_signed_name) !== norm(d.full_name)) {
    return fail("Họ tên xác nhận ở ô ký phải trùng khớp với họ tên người ký đã khai.");
  }

  const extraTerms = normalizeExtraTerms(d.extra_terms);
  if (d.extra_terms.length > 0 && extraTerms.length !== d.extra_terms.length) {
    return fail("Điều khoản riêng phải có đủ cả tiêu đề và nội dung.");
  }

  // ── Dựng toàn văn + băm ────────────────────────────────────────────────────
  const partyA = await getPartyA();

  const input: ContractInput = {
    kind: d.kind,
    party_type: partyType,
    full_name: d.full_name,
    display_name: d.display_name,
    date_of_birth: d.date_of_birth,
    game_uid: d.game_uid,
    email: d.email,
    phone: d.phone,
    contact_link: d.contact_link,
    area: d.area,
    team_name: asTeam ? d.team_name : "",
    team_tag: asTeam ? d.team_tag : "",
    team_size: asTeam ? d.team_size : "",
    rep_title: asTeam ? d.rep_title : "",
    channels: d.channels,
    guardian_name: d.guardian_name,
    guardian_relation: d.guardian_relation,
    guardian_phone: d.guardian_phone,
    tier: d.tier,
    member_role: d.kind === "member" ? d.member_role : "",
    duties: d.kind === "member" ? normalizeDuties(d.duties) : [],
    commitment: d.kind === "member" ? d.commitment : "",
    deliverables: d.kind === "tech" ? d.deliverables : "",
    sla: d.kind === "tech" ? d.sla : "",
    ip_ownership: d.ip_ownership,
    scope: d.scope,
    term_start: d.term_start,
    term_end: d.term_end,
    consideration: d.consideration,
    payment_terms: d.payment_terms,
    extra_terms: extraTerms,
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
    // tier chỉ có nghĩa với hợp tác đội nhóm — hình thức khác để trống cho khỏi hiểu nhầm.
    tier: d.kind === "team" ? d.tier : null,
    ip_ownership: d.kind === "tech" ? d.ip_ownership : null,
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

  const bName = partyBName(input);
  const kindLine = d.kind === "team" ? `${KIND_LABEL.team} · ${TIER_LABEL[d.tier]}` : KIND_LABEL[d.kind];

  await logContractEvent({
    contractId: row.id,
    event: "created",
    actor: "Bên B",
    detail: `${bName} — ${kindLine}`,
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
    title: "Hợp đồng mới chờ Arex ký",
    subtitle: `${row.code} · ${kindLine}`,
    sections: [
      {
        heading: "Bên B",
        rows: [
          { label: asTeam ? "Đội / nhóm" : "Người ký", value: bName, bold: true },
          { label: "Người ký", value: `${d.full_name}${asTeam ? ` — ${d.rep_title}` : ""}` },
          { label: "Liên lạc", value: d.contact_link, mono: true },
          { label: "Email", value: d.email, mono: true },
          ...(d.phone ? [{ label: "Điện thoại", value: d.phone, mono: true }] : []),
          ...(minor
            ? [
                {
                  label: "Người đại diện",
                  value: `${d.guardian_name} (${d.guardian_relation})`,
                  status: "warn" as const,
                },
              ]
            : []),
        ],
      },
      {
        heading: "Nội dung",
        rows: [
          { label: "Thời hạn", value: `${d.term_start} → ${d.term_end}` },
          ...(d.kind === "member" ? [{ label: "Vai trò", value: d.member_role }] : []),
          { label: "Giá trị", value: d.consideration || "Không phát sinh tiền" },
          {
            label: "Điều khoản riêng",
            value: extraTerms.length > 0 ? `${extraTerms.length} điều khoản Bên B thêm` : "Không có",
            status: extraTerms.length > 0 ? ("warn" as const) : undefined,
          },
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
