// Hợp đồng hợp tác điện tử — kiểu dữ liệu, trạng thái và MẪU ĐIỀU KHOẢN.
//
// File thuần (không import server-only) vì cả ba nơi cùng dựng đúng một văn bản:
//   • trang /partnership/hop-dong — xem trước lúc điền, ngay trên trình duyệt
//   • API khi ký — chụp lại toàn văn (`terms_text`) + băm SHA-256 làm bằng chứng
//   • trang xem lại & bảng quản trị — in ra đúng bản đã ký
// Đổi nội dung điều khoản thì PHẢI tăng CONTRACT_TERMS_VERSION: hợp đồng đã ký
// giữ bản chụp của riêng nó nên không bị ảnh hưởng, nhưng người đọc cần biết
// mình đang xem mẫu nào.
//
// Căn cứ pháp lý được viện dẫn trong mẫu: Bộ luật Dân sự 2015, Luật Thương mại
// 2005, Luật Quảng cáo 2012 (sửa đổi 2018), Luật Giao dịch điện tử 2023, Luật
// Sở hữu trí tuệ, Nghị định 13/2023/NĐ-CP, Nghị định 147/2024/NĐ-CP.

import { TIER_LABEL, type PartnerTier } from "@/lib/constants/partners";
import { PACKAGE_BENEFITS, PACKAGE_DUTIES, NOT_ACCEPTED } from "@/lib/constants/partnership";

export const CONTRACT_TERMS_VERSION = "1.0";

// ── Trạng thái ───────────────────────────────────────────────────────────────

export const CONTRACT_STATUSES = ["pending", "signed", "rejected", "terminated", "expired"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  pending: "Chờ Arex ký",
  signed: "Đã ký — đang hiệu lực",
  rejected: "Bị từ chối",
  terminated: "Đã chấm dứt",
  expired: "Hết hạn",
};

export const CONTRACT_STATUS_TONE: Record<ContractStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  signed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  terminated: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export const CONTRACT_EVENTS = [
  "created", "viewed", "signed_b", "signed_a", "rejected", "terminated", "expired", "note",
] as const;
export type ContractEventKind = (typeof CONTRACT_EVENTS)[number];

export const CONTRACT_EVENT_LABEL: Record<ContractEventKind, string> = {
  created: "Bên B tạo hợp đồng",
  viewed: "Mở xem hợp đồng",
  signed_b: "Bên B ký",
  signed_a: "Bên A ký",
  rejected: "Từ chối",
  terminated: "Chấm dứt",
  expired: "Hết hạn",
  note: "Ghi chú",
};

export const PARTY_TYPES = ["individual", "organization"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  individual: "Cá nhân",
  organization: "Tổ chức / doanh nghiệp",
};

// ── Bên A (Arex) ─────────────────────────────────────────────────────────────
// Sửa được ở /admin/partnership-contracts, lưu trong settings key bên dưới.
// Giữ nhỏ gọn để không làm nặng getSettings (xem BULKY_SETTING_KEYS).

export const SETTINGS_KEY_PARTY_A = "partnership.party_a";

export type PartyA = {
  name: string;
  /** Tư cách pháp lý, ví dụ "Hộ kinh doanh", "Công ty TNHH", "Nhóm cộng đồng". */
  legalForm?: string;
  address: string;
  taxCode?: string;
  regNo?: string;
  phone?: string;
  email: string;
  website: string;
  repName: string;
  repTitle: string;
};

export const DEFAULT_PARTY_A: PartyA = {
  name: "Arex Network",
  legalForm: "Nhóm vận hành cổng thông tin cộng đồng Free Fire",
  address: "Việt Nam",
  email: "contact@arexnetwork.site",
  website: "https://www.arexnetwork.vn",
  repName: "",
  repTitle: "Người đại diện",
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parsePartyA(raw: string | null | undefined): PartyA {
  if (!raw) return DEFAULT_PARTY_A;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_PARTY_A;
  }
  if (!data || typeof data !== "object") return DEFAULT_PARTY_A;
  const o = data as Record<string, unknown>;
  return {
    name: str(o.name, 150) || DEFAULT_PARTY_A.name,
    legalForm: str(o.legalForm, 150) || undefined,
    address: str(o.address, 250) || DEFAULT_PARTY_A.address,
    taxCode: str(o.taxCode, 30) || undefined,
    regNo: str(o.regNo, 50) || undefined,
    phone: str(o.phone, 30) || undefined,
    email: str(o.email, 150) || DEFAULT_PARTY_A.email,
    website: str(o.website, 200) || DEFAULT_PARTY_A.website,
    repName: str(o.repName, 100),
    repTitle: str(o.repTitle, 100) || DEFAULT_PARTY_A.repTitle,
  };
}

export function serializePartyA(p: PartyA): string {
  return JSON.stringify(parsePartyA(JSON.stringify(p)));
}

// ── Dữ liệu hợp đồng ─────────────────────────────────────────────────────────

/** Phần Bên B tự điền trên biểu mẫu. Tên trường trùng cột trong DB. */
export type ContractInput = {
  party_type: PartyType;
  full_name: string;
  date_of_birth: string;
  id_number: string;
  id_issued_date: string;
  id_issued_by: string;
  address: string;
  phone: string;
  email: string;
  org_name: string;
  org_tax_code: string;
  org_reg_no: string;
  rep_title: string;
  guardian_name: string;
  guardian_relation: string;
  guardian_id_number: string;
  guardian_phone: string;
  tier: PartnerTier;
  scope: string;
  channels: string;
  term_start: string;
  term_end: string;
  consideration: string;
  payment_terms: string;
};

export const EMPTY_CONTRACT_INPUT: ContractInput = {
  party_type: "individual",
  full_name: "",
  date_of_birth: "",
  id_number: "",
  id_issued_date: "",
  id_issued_by: "",
  address: "",
  phone: "",
  email: "",
  org_name: "",
  org_tax_code: "",
  org_reg_no: "",
  rep_title: "",
  guardian_name: "",
  guardian_relation: "",
  guardian_id_number: "",
  guardian_phone: "",
  tier: "community",
  scope: "",
  channels: "",
  term_start: "",
  term_end: "",
  consideration: "",
  payment_terms: "",
};

/** Một dòng hợp đồng như lưu trong DB. */
export type ContractRecord = ContractInput & {
  id: string;
  code: string;
  status: ContractStatus;
  /** Thông tin Bên A đúng lúc ký — dựng lại văn bản phải dùng bản này. */
  party_a: PartyA | null;
  terms_version: string;
  terms_text: string;
  terms_hash: string;
  b_signature: string | null;
  b_signed_name: string;
  b_signed_at: string;
  b_sign_ip: string | null;
  b_sign_device: string | null;
  b_sign_browser: string | null;
  a_signer_name: string | null;
  a_signer_title: string | null;
  a_signature: string | null;
  a_signed_at: string | null;
  a_sign_ip: string | null;
  reject_reason: string | null;
  admin_note: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

// ── Tính tuổi / vị thành niên ────────────────────────────────────────────────

/** Tuổi tròn tại ngày `at` (mặc định hôm nay). Trả về null nếu ngày sinh sai. */
export function ageFrom(dob: string, at: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return null;
  let age = at.getFullYear() - y;
  const monthDiff = at.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < d)) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

/**
 * Chưa đủ 18 tuổi → cần người đại diện theo pháp luật đồng ý (Điều 21 BLDS
 * 2015). Ngày sinh trống thì coi như chưa xác định, không ép khai giám hộ.
 */
export function isMinor(dob: string, at: Date = new Date()): boolean {
  const age = ageFrom(dob, at);
  return age !== null && age < 18;
}

// ── Định dạng ────────────────────────────────────────────────────────────────

/** "2026-08-21" → "ngày 21 tháng 08 năm 2026". Sai định dạng thì trả "…". */
export function vnDateWords(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "……/……/………";
  const [y, m, d] = iso.split("-");
  return `ngày ${d} tháng ${m} năm ${y}`;
}

export function vnDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function vnDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", " lúc");
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "……………………");

// ── Mẫu hợp đồng ─────────────────────────────────────────────────────────────

export type ContractLine = [label: string, value: string];
export type ContractArticle = { no: string; title: string; items: string[] };

export type ContractDocument = {
  title: string;
  code: string;
  signPlaceDate: string;
  bases: string[];
  partyA: { heading: string; lines: ContractLine[] };
  partyB: { heading: string; lines: ContractLine[] };
  guardian: { heading: string; lines: ContractLine[] } | null;
  articles: ContractArticle[];
  version: string;
};

export const LEGAL_BASES: string[] = [
  "Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;",
  "Luật Thương mại số 36/2005/QH11 ngày 14/6/2005;",
  "Luật Quảng cáo số 16/2012/QH13 ngày 21/6/2012 (sửa đổi, bổ sung năm 2018);",
  "Luật Giao dịch điện tử số 20/2023/QH15 ngày 22/6/2023;",
  "Luật Sở hữu trí tuệ số 50/2005/QH11 và các luật sửa đổi, bổ sung;",
  "Nghị định số 13/2023/NĐ-CP ngày 17/4/2023 về bảo vệ dữ liệu cá nhân;",
  "Nghị định số 147/2024/NĐ-CP ngày 09/11/2024 về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng;",
  "Nhu cầu và khả năng thực tế của hai bên.",
];

/**
 * Dựng toàn văn hợp đồng từ dữ liệu Bên B + thông tin Bên A.
 * `signDate` là ngày lập (ISO yyyy-mm-dd) — lúc xem trước thì lấy hôm nay.
 */
export function buildContractDocument(
  input: ContractInput,
  partyA: PartyA,
  meta: { code: string; signDate: string },
): ContractDocument {
  const org = input.party_type === "organization";
  // Tính theo NGÀY KÝ, không phải hôm nay: đứa trẻ ký lúc 17 tuổi rồi sang tuổi
  // 18 thì hợp đồng vẫn phải là bản có người đại diện, dựng lại mới khớp mã băm.
  const minor = isMinor(input.date_of_birth, new Date(`${meta.signDate}T00:00:00Z`));
  const tierLabel = TIER_LABEL[input.tier];
  const benefits = PACKAGE_BENEFITS[input.tier];
  const duties = PACKAGE_DUTIES[input.tier];
  const paid = input.consideration.trim().length > 0;

  const partyBLines: ContractLine[] = org
    ? [
        ["Tên tổ chức", dash(input.org_name)],
        ["Địa chỉ", dash(input.address)],
        ["Mã số thuế", dash(input.org_tax_code)],
        ["Số ĐKKD / quyết định thành lập", dash(input.org_reg_no)],
        ["Người đại diện", dash(input.full_name)],
        ["Chức vụ", dash(input.rep_title)],
        ["CCCD / Hộ chiếu người đại diện", dash(input.id_number)],
        ["Ngày cấp", input.id_issued_date ? vnDate(input.id_issued_date) : "……………………"],
        ["Nơi cấp", dash(input.id_issued_by)],
        ["Điện thoại", dash(input.phone)],
        ["Email", dash(input.email)],
        ["Kênh / nền tảng", dash(input.channels)],
      ]
    : [
        ["Họ và tên", dash(input.full_name)],
        ["Ngày sinh", input.date_of_birth ? vnDate(input.date_of_birth) : "……………………"],
        ["CCCD / Hộ chiếu", dash(input.id_number)],
        ["Ngày cấp", input.id_issued_date ? vnDate(input.id_issued_date) : "……………………"],
        ["Nơi cấp", dash(input.id_issued_by)],
        ["Địa chỉ liên hệ", dash(input.address)],
        ["Điện thoại", dash(input.phone)],
        ["Email", dash(input.email)],
        ["Kênh / nền tảng", dash(input.channels)],
      ];

  const partyALines: ContractLine[] = [
    ["Tên tổ chức", dash(partyA.name)],
    ...(partyA.legalForm ? ([["Tư cách", partyA.legalForm]] as ContractLine[]) : []),
    ["Địa chỉ", dash(partyA.address)],
    ...(partyA.taxCode ? ([["Mã số thuế", partyA.taxCode]] as ContractLine[]) : []),
    ...(partyA.regNo ? ([["Số ĐKKD", partyA.regNo]] as ContractLine[]) : []),
    ["Website", dash(partyA.website)],
    ["Email", dash(partyA.email)],
    ...(partyA.phone ? ([["Điện thoại", partyA.phone]] as ContractLine[]) : []),
    ["Người đại diện", dash(partyA.repName)],
    ["Chức vụ", dash(partyA.repTitle)],
  ];

  const guardian = minor
    ? {
        heading: "NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT CỦA BÊN B (Bên B chưa đủ 18 tuổi)",
        lines: [
          ["Họ và tên", dash(input.guardian_name)],
          ["Quan hệ với Bên B", dash(input.guardian_relation)],
          ["CCCD / Hộ chiếu", dash(input.guardian_id_number)],
          ["Điện thoại", dash(input.guardian_phone)],
        ] as ContractLine[],
      }
    : null;

  const articles: ContractArticle[] = [
    {
      no: "Điều 1",
      title: "Nội dung và phạm vi hợp tác",
      items: [
        `1.1. Hai bên thống nhất hợp tác theo gói “${tierLabel}” trên nền tảng do Bên A vận hành, bao gồm website ${partyA.website} cùng các kênh cộng đồng và ứng dụng đi kèm.`,
        `1.2. Nội dung hợp tác cụ thể do hai bên thống nhất: ${dash(input.scope)}`,
        `1.3. Kênh, nền tảng của Bên B tham gia hợp tác: ${dash(input.channels)}`,
        "1.4. Hợp đồng này không làm phát sinh quan hệ lao động, quan hệ đại lý, liên doanh hay pháp nhân mới giữa hai bên. Mỗi bên tự chịu trách nhiệm về hoạt động, nhân sự và nghĩa vụ tài chính của mình.",
        "1.5. Mọi nội dung hợp tác nằm ngoài phạm vi nêu trên phải được hai bên thỏa thuận bằng phụ lục.",
      ],
    },
    {
      no: "Điều 2",
      title: "Thời hạn hợp tác",
      items: [
        `2.1. Thời hạn hợp tác: từ ${vnDateWords(input.term_start)} đến hết ${vnDateWords(input.term_end)}.`,
        "2.2. Trước khi hết hạn tối thiểu 15 ngày, bên nào muốn gia hạn phải thông báo cho bên còn lại bằng văn bản hoặc thông điệp dữ liệu. Việc gia hạn chỉ có hiệu lực khi cả hai bên chấp thuận.",
        "2.3. Hết thời hạn mà hai bên không gia hạn, hệ thống của Bên A tự động ẩn thông tin đối tác của Bên B khỏi trang công khai và hợp đồng chấm dứt theo Điều 10.",
      ],
    },
    {
      no: "Điều 3",
      title: "Quyền lợi của Bên B — nghĩa vụ của Bên A",
      items: [
        "3.1. Trong thời hạn hợp đồng, Bên A bảo đảm cho Bên B các quyền lợi sau:",
        ...benefits.map((b, i) => `   ${String.fromCharCode(97 + i)}) ${b}`),
        "3.2. Bên A có quyền biên tập nội dung theo tiêu chuẩn trình bày của mình, miễn không làm sai lệch thông tin của Bên B; có quyền từ chối đăng tải nội dung vi phạm Điều 7 và yêu cầu Bên B cung cấp giấy tờ chứng minh tính hợp pháp của sản phẩm, dịch vụ.",
        "3.3. Bên A tự chịu toàn bộ chi phí vận hành hạ tầng, nhân sự để thực hiện các quyền lợi nêu tại khoản 3.1, trừ khoản chi phí phát sinh riêng đã thỏa thuận tại Điều 5.",
        "3.4. Bên A thông báo cho Bên B trước tối thiểu 03 ngày khi có thay đổi ảnh hưởng tới quyền lợi tại khoản 3.1.",
      ],
    },
    {
      no: "Điều 4",
      title: "Quyền và nghĩa vụ của Bên B",
      items: [
        "4.1. Bên B có nghĩa vụ:",
        ...duties.map((d, i) => `   ${String.fromCharCode(97 + i)}) ${d}`),
        `   ${String.fromCharCode(97 + duties.length)}) Cung cấp thông tin trung thực, chính xác trong hợp đồng này và chịu trách nhiệm trước pháp luật về thông tin đã cung cấp.`,
        `   ${String.fromCharCode(98 + duties.length)}) Không nhân danh Bên A để phát ngôn, giao dịch hoặc thu tiền của bên thứ ba ngoài phạm vi Điều 1.`,
        "4.2. Bên B có quyền yêu cầu Bên A thực hiện đúng, đủ các quyền lợi tại Điều 3; yêu cầu chỉnh sửa hoặc gỡ bỏ nội dung mô tả sai lệch về Bên B trong 03 ngày làm việc kể từ khi nhận yêu cầu hợp lý.",
        "4.3. Bên B có quyền yêu cầu Bên A cung cấp bản hợp đồng điện tử này bất kỳ lúc nào trong thời hạn lưu trữ nêu tại khoản 8.4.",
      ],
    },
    {
      no: "Điều 5",
      title: "Giá trị hợp tác, thanh toán và nghĩa vụ thuế",
      items: [
        paid
          ? `5.1. Giá trị hợp tác và các khoản trao đổi giữa hai bên: ${input.consideration.trim()}`
          : "5.1. Hai bên hợp tác trên cơ sở trao đổi quyền lợi, không phát sinh khoản thanh toán bằng tiền. Trường hợp sau này phát sinh, hai bên lập phụ lục ghi rõ giá trị và tiến độ.",
        input.payment_terms.trim()
          ? `5.2. Phương thức và tiến độ thanh toán: ${input.payment_terms.trim()}`
          : "5.2. Không áp dụng do hai bên không phát sinh nghĩa vụ thanh toán tại thời điểm ký.",
        "5.3. Mỗi bên tự thực hiện nghĩa vụ thuế của mình theo pháp luật Việt Nam. Trường hợp Bên B là tổ chức, Bên B xuất hóa đơn theo quy định. Trường hợp Bên B là cá nhân không ký hợp đồng lao động với Bên A, khoản chi trả từ 2.000.000 đồng trở lên cho mỗi lần chi trả bị khấu trừ 10% thuế thu nhập cá nhân trước khi chi trả theo điểm i khoản 1 Điều 25 Thông tư 111/2013/TT-BTC, trừ trường hợp Bên B có cam kết thu nhập chưa đến mức phải nộp thuế theo quy định.",
        "5.4. Chi phí đi lại, sản xuất nội dung riêng của bên nào do bên đó tự chịu, trừ khi có thỏa thuận khác bằng phụ lục.",
      ],
    },
    {
      no: "Điều 6",
      title: "Quyền sở hữu trí tuệ và sử dụng thương hiệu",
      items: [
        "6.1. Mỗi bên giữ nguyên quyền sở hữu đối với nhãn hiệu, logo, tên thương mại, nội dung và dữ liệu do mình tạo ra hoặc sở hữu hợp pháp.",
        "6.2. Trong thời hạn hợp đồng, mỗi bên cấp cho bên còn lại quyền sử dụng không độc quyền, không được chuyển nhượng lại đối với logo và tên thương hiệu của mình, chỉ nhằm mục đích thực hiện hợp đồng này.",
        "6.3. Nội dung do hai bên phối hợp sản xuất thuộc sở hữu chung; việc khai thác thương mại nội dung đó phải có sự đồng ý bằng văn bản của cả hai bên.",
        "6.4. Khi hợp đồng chấm dứt, quyền sử dụng tại khoản 6.2 chấm dứt theo. Mỗi bên gỡ bỏ logo, tên thương hiệu của bên còn lại khỏi kênh của mình trong 05 ngày làm việc, trừ nội dung đã đăng mang tính lưu trữ, ghi nhận lịch sử hợp tác.",
        "6.5. Bên nào cung cấp tư liệu xâm phạm quyền sở hữu trí tuệ của bên thứ ba thì bên đó chịu trách nhiệm giải quyết và bồi thường toàn bộ thiệt hại phát sinh cho bên còn lại.",
      ],
    },
    {
      no: "Điều 7",
      title: "Tuân thủ pháp luật và nội dung bị cấm",
      items: [
        "7.1. Hai bên không được sử dụng quan hệ hợp tác này để quảng bá, giới thiệu hoặc phân phối:",
        ...NOT_ACCEPTED.map((n, i) => `   ${String.fromCharCode(97 + i)}) ${n}`),
        "7.2. Hai bên không quảng cáo hàng hóa, dịch vụ cấm quảng cáo theo Điều 7 Luật Quảng cáo 2012; không đăng tải thông tin bị cấm theo Luật An ninh mạng 2018 và Nghị định 147/2024/NĐ-CP.",
        "7.3. Khi phát hiện vi phạm khoản 7.1 hoặc 7.2, Bên A được gỡ bỏ nội dung liên quan ngay lập tức và đơn phương chấm dứt hợp đồng mà không phải báo trước, không phải bồi thường. Bên vi phạm chịu trách nhiệm trước cơ quan nhà nước có thẩm quyền.",
      ],
    },
    {
      no: "Điều 8",
      title: "Bảo mật thông tin và bảo vệ dữ liệu cá nhân",
      items: [
        "8.1. Mỗi bên giữ bí mật thông tin nhận được từ bên còn lại trong quá trình hợp tác, trừ thông tin đã công khai hợp pháp hoặc phải cung cấp theo yêu cầu của cơ quan nhà nước có thẩm quyền. Nghĩa vụ này kéo dài 12 tháng kể từ ngày hợp đồng chấm dứt.",
        "8.2. Bên B đồng ý để Bên A thu thập và xử lý các dữ liệu cá nhân ghi trong hợp đồng này (họ tên, ngày sinh, số giấy tờ tùy thân, địa chỉ, điện thoại, email, hình ảnh chữ ký, địa chỉ IP và thông tin thiết bị lúc ký) cho mục đích giao kết, thực hiện, lưu trữ hợp đồng và liên hệ công việc, theo Nghị định 13/2023/NĐ-CP.",
        "8.3. Bên A không bán, không chuyển dữ liệu cá nhân của Bên B cho bên thứ ba ngoài trường hợp pháp luật yêu cầu. Bên B có quyền truy cập, yêu cầu chỉnh sửa, rút lại sự đồng ý hoặc yêu cầu xóa dữ liệu theo Điều 9 Nghị định 13/2023/NĐ-CP; việc rút lại sự đồng ý đối với dữ liệu bắt buộc để thực hiện hợp đồng có thể dẫn tới chấm dứt hợp đồng.",
        "8.4. Bên A lưu trữ hợp đồng và dữ liệu liên quan trong thời hạn hợp đồng và 05 năm kể từ ngày chấm dứt để phục vụ đối chiếu, giải quyết tranh chấp; sau thời hạn này dữ liệu được xóa hoặc ẩn danh.",
      ],
    },
    {
      no: "Điều 9",
      title: "Hình thức hợp đồng và chữ ký điện tử",
      items: [
        "9.1. Hợp đồng này được giao kết dưới dạng thông điệp dữ liệu và có giá trị pháp lý như hợp đồng bằng văn bản theo Điều 9 Luật Giao dịch điện tử 2023.",
        "9.2. Hai bên thống nhất sử dụng chữ ký điện tử gồm: hình ảnh chữ ký do người ký tự vẽ, họ tên do người ký gõ lại và thao tác xác nhận đồng ý trên hệ thống. Hai bên công nhận chữ ký này có giá trị như chữ ký tay đối với hợp đồng này. Đây là chữ ký điện tử theo thỏa thuận của các bên, không phải chữ ký số hay chữ ký điện tử chuyên dùng bảo đảm an toàn được cơ quan có thẩm quyền cấp chứng thực.",
        "9.3. Hệ thống của Bên A lưu lại toàn văn hợp đồng tại thời điểm ký, mã kiểm tra toàn vẹn SHA-256 của toàn văn, thời điểm ký, địa chỉ IP, thiết bị và trình duyệt của người ký. Hai bên công nhận các dữ liệu này là chứng cứ chứng minh việc giao kết và nội dung hợp đồng.",
        "9.4. Khi pháp luật yêu cầu hoặc một bên đề nghị, hai bên ký lại hợp đồng bằng bản giấy hoặc bằng chữ ký số có giá trị pháp lý tương đương, với nội dung không thay đổi so với bản điện tử này.",
        "9.5. Hợp đồng có hiệu lực kể từ thời điểm cả hai bên hoàn tất việc ký hợp lệ (Điều 400 Bộ luật Dân sự 2015). Chữ ký của Bên B ghi nhận đề nghị giao kết; hợp đồng chỉ phát sinh hiệu lực khi người đại diện Bên A ký chấp nhận.",
      ],
    },
    {
      no: "Điều 10",
      title: "Sửa đổi, tạm dừng và chấm dứt hợp đồng",
      items: [
        "10.1. Mọi sửa đổi, bổ sung phải lập thành phụ lục và được cả hai bên ký theo hình thức quy định tại Điều 9.",
        "10.2. Hợp đồng chấm dứt trong các trường hợp: hết thời hạn mà không gia hạn; hai bên thỏa thuận chấm dứt; một bên đơn phương chấm dứt và thông báo trước tối thiểu 15 ngày; một bên vi phạm Điều 7 hoặc vi phạm nghiêm trọng nghĩa vụ hợp đồng mà không khắc phục trong 07 ngày kể từ khi nhận thông báo.",
        "10.3. Khi chấm dứt, Bên A gỡ bỏ logo, liên kết và các nội dung quảng bá của Bên B khỏi trang công khai trong 05 ngày làm việc; hai bên quyết toán các nghĩa vụ tài chính đã phát sinh trong 15 ngày.",
        "10.4. Các Điều 6, 8, 11 và 13 vẫn còn hiệu lực sau khi hợp đồng chấm dứt.",
      ],
    },
    {
      no: "Điều 11",
      title: "Vi phạm, phạt vi phạm và bồi thường thiệt hại",
      items: [
        "11.1. Bên vi phạm nghĩa vụ phải chịu phạt vi phạm theo thỏa thuận, mức phạt tối đa 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm theo Điều 301 Luật Thương mại 2005. Trường hợp hợp tác không phát sinh thanh toán bằng tiền, hai bên không áp dụng phạt vi phạm bằng tiền.",
        "11.2. Bên vi phạm bồi thường thiệt hại thực tế, trực tiếp mà bên bị vi phạm phải gánh chịu theo Điều 302 Luật Thương mại 2005 và Điều 360 Bộ luật Dân sự 2015.",
        "11.3. Bên nào có hành vi vi phạm pháp luật thì bên đó tự chịu trách nhiệm trước cơ quan nhà nước có thẩm quyền và trước bên thứ ba.",
      ],
    },
    {
      no: "Điều 12",
      title: "Sự kiện bất khả kháng",
      items: [
        "12.1. Sự kiện bất khả kháng là sự kiện xảy ra khách quan, không thể lường trước và không thể khắc phục dù đã áp dụng mọi biện pháp cần thiết trong khả năng cho phép, theo khoản 1 Điều 156 Bộ luật Dân sự 2015; bao gồm thiên tai, dịch bệnh, chiến tranh, thay đổi chính sách pháp luật, sự cố hạ tầng mạng diện rộng.",
        "12.2. Bên gặp sự kiện bất khả kháng phải thông báo cho bên còn lại trong 07 ngày kể từ khi sự kiện xảy ra và được miễn trách nhiệm trong phạm vi ảnh hưởng.",
        "12.3. Nếu sự kiện kéo dài quá 30 ngày, mỗi bên có quyền chấm dứt hợp đồng mà không phải chịu phạt vi phạm.",
      ],
    },
    {
      no: "Điều 13",
      title: "Luật áp dụng và giải quyết tranh chấp",
      items: [
        "13.1. Hợp đồng này được điều chỉnh và giải thích theo pháp luật nước Cộng hòa xã hội chủ nghĩa Việt Nam.",
        "13.2. Mọi tranh chấp phát sinh trước hết được giải quyết bằng thương lượng, hòa giải trong thời hạn 30 ngày kể từ ngày một bên gửi thông báo tranh chấp.",
        "13.3. Nếu thương lượng không thành, tranh chấp được đưa ra Tòa án nhân dân có thẩm quyền theo quy định của Bộ luật Tố tụng dân sự 2015 để giải quyết. Phán quyết của Tòa án là chung thẩm và ràng buộc hai bên.",
      ],
    },
    {
      no: "Điều 14",
      title: "Điều khoản chung",
      items: [
        "14.1. Hai bên xác nhận đã đọc, hiểu rõ và tự nguyện giao kết hợp đồng; người ký có đủ năng lực hành vi dân sự và thẩm quyền đại diện theo Điều 117 Bộ luật Dân sự 2015.",
        minor
          ? "14.2. Bên B chưa đủ 18 tuổi. Việc giao kết hợp đồng này đã được người đại diện theo pháp luật của Bên B đồng ý theo khoản 3 và khoản 4 Điều 21 Bộ luật Dân sự 2015; thông tin người đại diện được ghi tại phần đầu hợp đồng và người đại diện cùng chịu trách nhiệm về việc thực hiện hợp đồng."
          : "14.2. Bên B xác nhận đã đủ 18 tuổi và có đầy đủ năng lực hành vi dân sự để tự mình xác lập, thực hiện hợp đồng này.",
        "14.3. Hợp đồng được lập thành 02 bản điện tử có nội dung như nhau, mỗi bên giữ 01 bản, có giá trị pháp lý ngang nhau.",
        "14.4. Nếu một điều khoản bị coi là vô hiệu, các điều khoản còn lại vẫn giữ nguyên hiệu lực; hai bên thỏa thuận thay thế điều khoản vô hiệu bằng điều khoản hợp pháp có nội dung gần nhất.",
        `14.5. Hợp đồng áp dụng mẫu điều khoản phiên bản ${CONTRACT_TERMS_VERSION}. Mã kiểm tra toàn vẹn SHA-256 của toàn văn được ghi kèm bản hợp đồng điện tử.`,
      ],
    },
  ];

  return {
    title: `HỢP ĐỒNG HỢP TÁC — ${tierLabel.toUpperCase()}`,
    code: meta.code,
    signPlaceDate: `Hôm nay, ${vnDateWords(meta.signDate)}, hai bên gồm:`,
    bases: LEGAL_BASES,
    partyA: { heading: "BÊN A (BÊN MỜI HỢP TÁC)", lines: partyALines },
    partyB: { heading: `BÊN B (ĐỐI TÁC) — ${PARTY_TYPE_LABEL[input.party_type].toUpperCase()}`, lines: partyBLines },
    guardian,
    articles,
    version: CONTRACT_TERMS_VERSION,
  };
}

/** Toàn văn dạng chữ thuần — bản này mới là thứ đem đi băm và lưu làm bằng chứng. */
export function contractToPlainText(doc: ContractDocument): string {
  const out: string[] = [
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "---------------",
    "",
    doc.title,
    `Số: ${doc.code}`,
    "",
    "Căn cứ:",
    ...doc.bases.map((b) => `- ${b}`),
    "",
    doc.signPlaceDate,
    "",
    doc.partyA.heading,
    ...doc.partyA.lines.map(([k, v]) => `${k}: ${v}`),
    "",
    doc.partyB.heading,
    ...doc.partyB.lines.map(([k, v]) => `${k}: ${v}`),
  ];

  if (doc.guardian) {
    out.push("", doc.guardian.heading, ...doc.guardian.lines.map(([k, v]) => `${k}: ${v}`));
  }

  out.push("", "Hai bên thống nhất giao kết hợp đồng với các điều khoản sau:");

  for (const a of doc.articles) {
    out.push("", `${a.no}. ${a.title}`, ...a.items);
  }

  out.push("", `Mẫu điều khoản phiên bản ${doc.version}.`);
  return out.join("\n");
}

/**
 * Dòng DB → dữ liệu dựng văn bản. Cột nào NULL thì về chuỗi rỗng, vì mẫu hợp
 * đồng tự thay bằng dấu chấm lửng cho đúng kiểu bản giấy.
 */
export function recordToInput(row: Partial<ContractRecord>): ContractInput {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    party_type: row.party_type === "organization" ? "organization" : "individual",
    full_name: s(row.full_name),
    date_of_birth: s(row.date_of_birth),
    id_number: s(row.id_number),
    id_issued_date: s(row.id_issued_date),
    id_issued_by: s(row.id_issued_by),
    address: s(row.address),
    phone: s(row.phone),
    email: s(row.email),
    org_name: s(row.org_name),
    org_tax_code: s(row.org_tax_code),
    org_reg_no: s(row.org_reg_no),
    rep_title: s(row.rep_title),
    guardian_name: s(row.guardian_name),
    guardian_relation: s(row.guardian_relation),
    guardian_id_number: s(row.guardian_id_number),
    guardian_phone: s(row.guardian_phone),
    tier: row.tier ?? "community",
    scope: s(row.scope),
    channels: s(row.channels),
    term_start: s(row.term_start),
    term_end: s(row.term_end),
    consideration: s(row.consideration),
    payment_terms: s(row.payment_terms),
  };
}

/** Ngày (yyyy-mm-dd) theo giờ Việt Nam của một mốc thời gian ISO. */
export function vnIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
