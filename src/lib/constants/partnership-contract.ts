// Hợp đồng điện tử của Arex — kiểu dữ liệu, trạng thái và MẪU ĐIỀU KHOẢN.
//
// Ba hình thức, mỗi hình thức một bộ điều khoản riêng:
//   • team   — Đội / cộng đồng đối tác  ↔ đội ngũ Arex
//   • member — Cá nhân tham gia đội ngũ ↔ đội ngũ Arex
//   • tech   — Đối tác kỹ thuật         ↔ đội ngũ Arex
//
// Đây là hợp đồng giữa các đội nhóm và cá nhân trong cộng đồng, KHÔNG phải hợp
// đồng giữa hai doanh nghiệp: biểu mẫu không hỏi căn cước, mã số thuế, giấy
// đăng ký kinh doanh. Danh tính xác định bằng tên đội / biệt danh, người ký,
// email, kênh liên lạc, cộng thêm dấu vết ký (thời điểm, IP, thiết bị).
//
// File thuần (không import server-only) vì cả ba nơi cùng dựng đúng một văn bản:
//   • trang /partnership/hop-dong — xem trước lúc điền, ngay trên trình duyệt
//   • API khi ký — chụp lại toàn văn (`terms_text`) + băm SHA-256 làm bằng chứng
//   • trang xem lại & bảng quản trị — in ra đúng bản đã ký
// Đổi nội dung điều khoản thì PHẢI tăng CONTRACT_TERMS_VERSION: hợp đồng đã ký
// giữ bản chụp của riêng nó nên không bị ảnh hưởng, nhưng người đọc cần biết
// mình đang xem mẫu nào.
//
// Căn cứ pháp lý viện dẫn trong mẫu: Bộ luật Dân sự 2015, Luật Giao dịch điện
// tử 2023, Luật Sở hữu trí tuệ, Luật Quảng cáo 2012 (sửa đổi 2018), Nghị định
// 13/2023/NĐ-CP, Nghị định 147/2024/NĐ-CP.

import { TIER_LABEL, type PartnerTier } from "@/lib/constants/partners";
import {
  PACKAGE_BENEFITS, PACKAGE_DUTIES, MEMBER_BENEFITS, MEMBER_DUTIES,
  TECH_BENEFITS, TECH_DUTIES, NOT_ACCEPTED,
  IP_OWNERSHIP_CLAUSE, IP_OWNERSHIP_LABEL, IP_OWNERSHIP_OPTIONS, type IpOwnership,
} from "@/lib/constants/partnership";

/** Mẫu 2.0: bỏ giấy tờ tùy thân, tách ba hình thức, thêm điều khoản riêng. */
export const CONTRACT_TERMS_VERSION = "2.0";

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
  created: "Tạo hợp đồng",
  viewed: "Mở xem hợp đồng",
  signed_b: "Bên B ký",
  signed_a: "Bên A ký",
  rejected: "Từ chối",
  terminated: "Chấm dứt",
  expired: "Hết hạn",
  note: "Ghi chú",
};

// ── Hình thức hợp đồng ───────────────────────────────────────────────────────

export const CONTRACT_KINDS = ["team", "member", "tech"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

export const KIND_LABEL: Record<ContractKind, string> = {
  team: "Hợp tác đội nhóm",
  member: "Tham gia đội ngũ",
  tech: "Đối tác kỹ thuật",
};

/** Ai với ai — hiện ở thẻ chọn hình thức và trong bảng quản trị. */
export const KIND_PAIR: Record<ContractKind, string> = {
  team: "Đội / cộng đồng ↔ Đội ngũ Arex",
  member: "Thành viên ↔ Đội ngũ Arex",
  tech: "Đối tác kỹ thuật ↔ Đội ngũ Arex",
};

export const KIND_DESC: Record<ContractKind, string> = {
  team: "Hai đội cùng làm sự kiện, tài trợ giải, đổi bài chéo hoặc đồng hành cộng đồng. Chọn thêm gói hợp tác để chốt quyền lợi.",
  member: "Cá nhân vào đội ngũ Arex làm nội dung, kiểm duyệt, thiết kế, kỹ thuật, hỗ trợ. Ghi rõ vai trò, mảng phụ trách và mức cam kết.",
  tech: "Nhận làm hoặc hỗ trợ một hạng mục kỹ thuật: tính năng, công cụ, hạ tầng, tích hợp. Ghi rõ bàn giao, mức hỗ trợ và quyền sở hữu sản phẩm.",
};

export const KIND_DOC_TITLE: Record<ContractKind, string> = {
  team: "HỢP ĐỒNG HỢP TÁC",
  member: "HỢP ĐỒNG THAM GIA ĐỘI NGŨ",
  tech: "HỢP ĐỒNG HỢP TÁC KỸ THUẬT",
};

/** Số ngày báo trước khi một bên đơn phương dừng — thành viên nhẹ hơn đối tác. */
export const KIND_NOTICE_DAYS: Record<ContractKind, number> = { team: 15, member: 7, tech: 15 };

export const isContractKind = (v: unknown): v is ContractKind =>
  typeof v === "string" && (CONTRACT_KINDS as readonly string[]).includes(v);

// ── Tư cách Bên B ────────────────────────────────────────────────────────────

export const PARTY_TYPES = ["person", "team"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  person: "Cá nhân",
  team: "Đội, nhóm, cộng đồng",
};

/** Hình thức nào ép sẵn tư cách Bên B; `null` là để người ký tự chọn. */
export const KIND_FORCED_PARTY: Record<ContractKind, PartyType | null> = {
  team: "team",
  member: "person",
  tech: null,
};

export function partyTypeFor(kind: ContractKind, chosen: PartyType): PartyType {
  return KIND_FORCED_PARTY[kind] ?? chosen;
}

// ── Bên A (Arex) ─────────────────────────────────────────────────────────────
// Sửa được ở /admin/partnership-contracts, lưu trong settings key bên dưới.
// Giữ nhỏ gọn để không làm nặng getSettings (xem BULKY_SETTING_KEYS).

export const SETTINGS_KEY_PARTY_A = "partnership.party_a";

export type PartyA = {
  name: string;
  /** Tư cách thực tế, ví dụ "Đội ngũ vận hành cổng thông tin cộng đồng". */
  legalForm?: string;
  /** Khu vực hoạt động — không cần địa chỉ trụ sở vì Arex không phải doanh nghiệp. */
  address: string;
  phone?: string;
  email: string;
  website: string;
  repName: string;
  repTitle: string;
};

export const DEFAULT_PARTY_A: PartyA = {
  name: "Arex Network",
  legalForm: "Đội ngũ vận hành cổng thông tin cộng đồng Free Fire",
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

// ── Điều khoản riêng do người ký đưa vào ─────────────────────────────────────
// Đây là phần khiến hợp đồng không phải "mẫu có sẵn ký cho xong": Bên B viết
// thêm điều khoản của mình, chúng nằm thành một Điều riêng trong toàn văn và
// được băm chung — Bên A đọc rồi mới ký, không ký thì từ chối.

export type ExtraTerm = { title: string; body: string };

export const EXTRA_TERMS_MAX = 10;
export const EXTRA_TERM_TITLE_MAX = 120;
export const EXTRA_TERM_BODY_MAX = 1200;

/** Mẫu gợi ý — bấm là chèn vào rồi sửa lại cho đúng việc của mình. */
export const EXTRA_TERM_PRESETS: ExtraTerm[] = [
  {
    title: "Độc quyền trong phạm vi hợp tác",
    body: "Trong thời hạn hợp đồng, Bên A không hợp tác cùng nội dung nêu tại điều khoản phạm vi với đội, nhóm hoặc kênh khác có cùng lĩnh vực hoạt động với Bên B, trừ khi được Bên B đồng ý bằng văn bản hoặc thông điệp dữ liệu.",
  },
  {
    title: "Gia hạn tự động",
    body: "Hết thời hạn hợp tác mà không bên nào gửi thông báo dừng trước 15 ngày, hợp đồng tự động gia hạn thêm một kỳ có độ dài bằng kỳ trước, các điều khoản khác giữ nguyên.",
  },
  {
    title: "Ghi nhận tác giả và quyền gỡ nội dung",
    body: "Mọi nội dung do Bên B sản xuất được đăng kèm tên hoặc biệt danh của Bên B. Khi hợp tác chấm dứt, Bên B có quyền yêu cầu gỡ nội dung của mình trong 07 ngày làm việc, trừ nội dung đã trở thành tư liệu lưu trữ của sự kiện chung.",
  },
  {
    title: "Chia sẻ doanh thu",
    body: "Với các hoạt động phát sinh doanh thu trực tiếp từ nội dung hợp tác, hai bên chia theo tỷ lệ … (Bên A) / … (Bên B). Bên nhận tiền đối soát và chuyển phần của bên còn lại trong 07 ngày kể từ ngày nhận đủ.",
  },
  {
    title: "Bảo mật mở rộng",
    body: "Ngoài nghĩa vụ bảo mật chung, hai bên không tiết lộ nội dung thương lượng, số liệu vận hành và tài liệu nội bộ của nhau cho bất kỳ bên thứ ba nào, kể cả sau khi hợp đồng chấm dứt, trừ khi có yêu cầu của cơ quan nhà nước có thẩm quyền.",
  },
  {
    title: "Phạt chậm bàn giao",
    body: "Bên nào chậm bàn giao hạng mục đã cam kết quá 07 ngày mà không có lý do chính đáng thì phải bù bằng việc kéo dài quyền lợi tương ứng cho bên còn lại, hoặc theo mức hai bên thống nhất tại thời điểm phát sinh.",
  },
  {
    title: "Người liên hệ đầu mối",
    body: "Mỗi bên cử một người đầu mối chịu trách nhiệm trao đổi hằng ngày. Thông báo gửi tới người đầu mối qua email hoặc kênh liên lạc ghi trong hợp đồng được coi là đã gửi hợp lệ cho bên đó.",
  },
  {
    title: "Tạm dừng vì lý do cá nhân",
    body: "Bên B được tạm dừng thực hiện hợp đồng tối đa 30 ngày vì lý do học tập, sức khỏe hoặc việc riêng, với điều kiện báo trước 03 ngày. Thời gian tạm dừng được cộng thêm vào thời hạn hợp đồng nếu hai bên đồng ý.",
  },
];

/** Lọc mảng điều khoản riêng — dùng ở cả API trước khi ghi lẫn UI khi đọc ra. */
export function normalizeExtraTerms(raw: unknown): ExtraTerm[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraTerm[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = str(o.title, EXTRA_TERM_TITLE_MAX);
    const body = str(o.body, EXTRA_TERM_BODY_MAX);
    if (!title || !body) continue;
    out.push({ title, body });
    if (out.length >= EXTRA_TERMS_MAX) break;
  }
  return out;
}

// ── Dữ liệu hợp đồng ─────────────────────────────────────────────────────────

/** Phần Bên B tự điền trên biểu mẫu. Tên trường trùng cột trong DB. */
export type ContractInput = {
  kind: ContractKind;
  party_type: PartyType;

  // Người ký — không hỏi giấy tờ tùy thân
  full_name: string;
  display_name: string;
  date_of_birth: string;
  game_uid: string;
  email: string;
  phone: string;
  contact_link: string;
  area: string;

  // Khi Bên B là đội / nhóm
  team_name: string;
  team_tag: string;
  team_size: string;
  rep_title: string;
  channels: string;

  // Người đại diện theo pháp luật — chỉ khi người ký chưa đủ 18 tuổi
  guardian_name: string;
  guardian_relation: string;
  guardian_phone: string;

  // Nội dung theo từng hình thức
  tier: PartnerTier;
  member_role: string;
  duties: string[];
  commitment: string;
  deliverables: string;
  sla: string;
  ip_ownership: IpOwnership;

  scope: string;
  term_start: string;
  term_end: string;
  consideration: string;
  payment_terms: string;
  extra_terms: ExtraTerm[];
};

export const EMPTY_CONTRACT_INPUT: ContractInput = {
  kind: "team",
  party_type: "team",
  full_name: "",
  display_name: "",
  date_of_birth: "",
  game_uid: "",
  email: "",
  phone: "",
  contact_link: "",
  area: "",
  team_name: "",
  team_tag: "",
  team_size: "",
  rep_title: "",
  channels: "",
  guardian_name: "",
  guardian_relation: "",
  guardian_phone: "",
  tier: "community",
  member_role: "",
  duties: [],
  commitment: "",
  deliverables: "",
  sla: "",
  ip_ownership: "arex",
  scope: "",
  term_start: "",
  term_end: "",
  consideration: "",
  payment_terms: "",
  extra_terms: [],
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

/** Tên gọi Bên B trong danh sách, email, bảng quản trị. */
export function partyBName(row: Pick<ContractRecord, "party_type" | "team_name" | "display_name" | "full_name">): string {
  if (row.party_type === "team") return row.team_name || row.display_name || row.full_name;
  return row.display_name || row.full_name;
}

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
 * 2015). Ngày sinh trống thì coi như chưa xác định, không ép khai người đại diện.
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

const BASE_DANSU = "Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;";
const BASE_GDDT = "Luật Giao dịch điện tử số 20/2023/QH15 ngày 22/6/2023;";
const BASE_SHTT = "Luật Sở hữu trí tuệ số 50/2005/QH11 và các luật sửa đổi, bổ sung;";
const BASE_ND13 = "Nghị định số 13/2023/NĐ-CP ngày 17/4/2023 về bảo vệ dữ liệu cá nhân;";
const BASE_ND147 =
  "Nghị định số 147/2024/NĐ-CP ngày 09/11/2024 về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng;";
const BASE_QUANGCAO = "Luật Quảng cáo số 16/2012/QH13 ngày 21/6/2012 (sửa đổi, bổ sung năm 2018);";
const BASE_ANNINHMANG = "Luật An ninh mạng số 24/2018/QH14 ngày 12/6/2018;";
const BASE_NEED = "Nhu cầu và khả năng thực tế của hai bên.";

/** Căn cứ pháp lý theo từng hình thức — trích đúng thứ liên quan, không kể lể. */
export const LEGAL_BASES_BY_KIND: Record<ContractKind, string[]> = {
  team: [BASE_DANSU, BASE_QUANGCAO, BASE_GDDT, BASE_SHTT, BASE_ND13, BASE_ND147, BASE_NEED],
  member: [BASE_DANSU, BASE_GDDT, BASE_SHTT, BASE_ND13, BASE_ND147, BASE_NEED],
  tech: [BASE_DANSU, BASE_GDDT, BASE_SHTT, BASE_ND13, BASE_ANNINHMANG, BASE_NEED],
};

/** Danh sách chung, dùng cho phần "căn cứ pháp lý của mẫu" trên trang giới thiệu. */
export const LEGAL_BASES: string[] = [
  BASE_DANSU, BASE_GDDT, BASE_SHTT, BASE_QUANGCAO, BASE_ANNINHMANG, BASE_ND13, BASE_ND147, BASE_NEED,
];

/**
 * Điều khoản soạn thô: `title` + `items`. Mục bắt đầu bằng "- " là gạch đầu
 * dòng con của mục đánh số ngay trước nó. Việc đánh số (1.1, 1.2, a), b)…) do
 * `numberArticles` làm, nhờ vậy chèn thêm/bớt một Điều không phải sửa tay số
 * thứ tự của những Điều còn lại.
 */
type DraftArticle = { title: string; items: string[] };

function numberArticles(drafts: DraftArticle[]): ContractArticle[] {
  return drafts.map((article, index) => {
    const no = index + 1;
    let clause = 0;
    let bullet = 0;
    const items = article.items.map((raw) => {
      if (raw.startsWith("- ")) {
        const letter = String.fromCharCode(97 + bullet);
        bullet += 1;
        return `   ${letter}) ${raw.slice(2)}`;
      }
      bullet = 0;
      clause += 1;
      return `${no}.${clause}. ${raw}`;
    });
    return { no: `Điều ${no}`, title: article.title, items };
  });
}

const bullets = (list: string[]) => list.map((item) => `- ${item}`);

// ── Các Điều dùng chung cho cả ba hình thức ──────────────────────────────────

function artContent(kind: ContractKind, partyA: PartyA): DraftArticle {
  const platform = `nền tảng do Bên A vận hành, gồm website ${partyA.website} cùng các kênh cộng đồng và ứng dụng đi kèm`;
  return {
    title: "Quy tắc nội dung và những việc hai bên không làm",
    items: [
      `Hai bên không dùng quan hệ hợp tác này và không dùng ${platform} để giới thiệu, quảng bá hoặc phân phối:`,
      ...bullets(NOT_ACCEPTED),
      "Hai bên không đăng tải thông tin bị cấm theo Luật An ninh mạng 2018 và Nghị định 147/2024/NĐ-CP; không quảng cáo hàng hóa, dịch vụ cấm quảng cáo theo Điều 7 Luật Quảng cáo 2012.",
      "Khi phát hiện vi phạm, Bên A được gỡ nội dung liên quan ngay lập tức và đơn phương chấm dứt hợp đồng mà không phải báo trước, không phải bồi thường. Bên vi phạm tự chịu trách nhiệm trước cơ quan nhà nước có thẩm quyền và trước bên thứ ba.",
    ],
  };
}

function artPrivacy(kind: ContractKind): DraftArticle {
  const collected =
    kind === "member"
      ? "họ tên, biệt danh, ngày sinh, email, số điện thoại, kênh liên lạc, UID trong game, hình ảnh chữ ký, địa chỉ IP và thông tin thiết bị lúc ký"
      : "tên đội hoặc biệt danh, họ tên người ký, email, số điện thoại, kênh liên lạc, hình ảnh chữ ký, địa chỉ IP và thông tin thiết bị lúc ký";
  return {
    title: "Bảo mật thông tin và bảo vệ dữ liệu cá nhân",
    items: [
      "Mỗi bên giữ bí mật thông tin nhận được từ bên còn lại trong quá trình hợp tác, trừ thông tin đã công khai hợp pháp hoặc phải cung cấp theo yêu cầu của cơ quan nhà nước có thẩm quyền. Nghĩa vụ này kéo dài 12 tháng kể từ ngày hợp đồng chấm dứt.",
      `Bên B đồng ý để Bên A thu thập và xử lý dữ liệu cá nhân ghi trong hợp đồng này (${collected}) cho mục đích giao kết, thực hiện, lưu trữ hợp đồng và liên hệ công việc, theo Nghị định 13/2023/NĐ-CP.`,
      "Bên A không bán, không chuyển dữ liệu cá nhân của Bên B cho bên thứ ba ngoài trường hợp pháp luật yêu cầu. Bên B có quyền truy cập, yêu cầu chỉnh sửa, rút lại sự đồng ý hoặc yêu cầu xóa dữ liệu theo Điều 9 Nghị định 13/2023/NĐ-CP; việc rút lại sự đồng ý đối với dữ liệu bắt buộc để thực hiện hợp đồng có thể dẫn tới chấm dứt hợp đồng.",
      "Bên A lưu trữ hợp đồng và dữ liệu liên quan trong thời hạn hợp đồng và 05 năm kể từ ngày chấm dứt để phục vụ đối chiếu, giải quyết tranh chấp; sau thời hạn này dữ liệu được xóa hoặc ẩn danh.",
      "Hợp đồng này không yêu cầu và Bên A không thu thập giấy tờ tùy thân, mã số thuế hay giấy đăng ký kinh doanh của Bên B. Danh tính các bên xác định qua tên gọi, kênh liên lạc đã khai và dấu vết ký nêu tại điều khoản về chữ ký điện tử.",
    ],
  };
}

function artESign(): DraftArticle {
  return {
    title: "Hình thức hợp đồng và chữ ký điện tử",
    items: [
      "Hợp đồng này được giao kết dưới dạng thông điệp dữ liệu và có giá trị pháp lý như hợp đồng bằng văn bản theo Điều 9 Luật Giao dịch điện tử 2023.",
      "Hai bên thống nhất sử dụng chữ ký điện tử gồm: hình ảnh chữ ký do người ký tự vẽ, họ tên do người ký gõ lại và thao tác xác nhận đồng ý trên hệ thống. Hai bên công nhận chữ ký này có giá trị như chữ ký tay đối với hợp đồng này. Đây là chữ ký điện tử theo thỏa thuận của các bên, không phải chữ ký số hay chữ ký điện tử chuyên dùng bảo đảm an toàn được cơ quan có thẩm quyền cấp chứng thực.",
      "Hệ thống của Bên A lưu lại toàn văn hợp đồng tại thời điểm ký, mã kiểm tra toàn vẹn SHA-256 của toàn văn, thời điểm ký, địa chỉ IP, thiết bị và trình duyệt của người ký. Hai bên công nhận các dữ liệu này là chứng cứ chứng minh việc giao kết và nội dung hợp đồng.",
      "Khi pháp luật yêu cầu hoặc một bên đề nghị, hai bên ký lại hợp đồng bằng bản giấy hoặc bằng chữ ký số có giá trị pháp lý tương đương, với nội dung không thay đổi so với bản điện tử này.",
      "Hợp đồng có hiệu lực kể từ thời điểm cả hai bên hoàn tất việc ký hợp lệ (Điều 400 Bộ luật Dân sự 2015). Chữ ký của Bên B ghi nhận đề nghị giao kết; hợp đồng chỉ phát sinh hiệu lực khi người đại diện Bên A ký chấp nhận.",
    ],
  };
}

function artBreach(kind: ContractKind): DraftArticle {
  const steps =
    kind === "member"
      ? [
          "Vi phạm nhẹ, lần đầu: Bên A nhắc nhở và nêu rõ điểm cần sửa; Bên B khắc phục trong 03 ngày.",
          "Tái phạm hoặc vi phạm nghiêm trọng: Bên A tạm dừng quyền thao tác của Bên B tối đa 15 ngày để làm rõ.",
          "Vi phạm quy tắc nội dung, làm lộ dữ liệu người dùng hoặc dùng quyền hạn sai mục đích: chấm dứt ngay, thu hồi toàn bộ quyền truy cập và huy hiệu vai trò.",
        ]
      : [
          "Bên vi phạm phải khắc phục trong 07 ngày kể từ khi nhận thông báo của bên còn lại.",
          "Không khắc phục được thì bên bị vi phạm có quyền chấm dứt hợp đồng ngay mà không phải báo trước theo thời hạn thông thường.",
          "Vi phạm quy tắc nội dung hoặc gây thiệt hại cho bên còn lại thì chấm dứt ngay lập tức.",
        ];
  return {
    title: "Vi phạm và cách xử lý",
    items: [
      "Khi một bên không thực hiện đúng nghĩa vụ, hai bên xử lý theo trình tự:",
      ...bullets(steps),
      "Bên vi phạm bồi thường thiệt hại thực tế, trực tiếp mà bên bị vi phạm phải gánh chịu theo Điều 360 và Điều 361 Bộ luật Dân sự 2015. Hai bên không áp dụng phạt vi phạm bằng tiền, trừ khi có thỏa thuận riêng ghi tại điều khoản bổ sung.",
      "Bên nào có hành vi vi phạm pháp luật thì bên đó tự chịu trách nhiệm trước cơ quan nhà nước có thẩm quyền và trước bên thứ ba.",
    ],
  };
}

function artForceMajeure(): DraftArticle {
  return {
    title: "Sự kiện bất khả kháng",
    items: [
      "Sự kiện bất khả kháng là sự kiện xảy ra khách quan, không thể lường trước và không thể khắc phục dù đã áp dụng mọi biện pháp cần thiết trong khả năng cho phép, theo khoản 1 Điều 156 Bộ luật Dân sự 2015; bao gồm thiên tai, dịch bệnh, chiến tranh, thay đổi chính sách pháp luật, sự cố hạ tầng mạng diện rộng, việc nhà phát hành trò chơi thay đổi hoặc dừng dịch vụ.",
      "Bên gặp sự kiện bất khả kháng phải thông báo cho bên còn lại trong 07 ngày kể từ khi sự kiện xảy ra và được miễn trách nhiệm trong phạm vi ảnh hưởng.",
      "Nếu sự kiện kéo dài quá 30 ngày, mỗi bên có quyền chấm dứt hợp đồng mà không phải chịu trách nhiệm với bên còn lại.",
    ],
  };
}

function artDispute(): DraftArticle {
  return {
    title: "Luật áp dụng và giải quyết tranh chấp",
    items: [
      "Hợp đồng này được điều chỉnh và giải thích theo pháp luật nước Cộng hòa xã hội chủ nghĩa Việt Nam.",
      "Mọi tranh chấp phát sinh trước hết được giải quyết bằng thương lượng trực tiếp giữa hai bên trong thời hạn 30 ngày kể từ ngày một bên gửi thông báo tranh chấp. Trong thời gian này, hai bên không công khai nội dung tranh chấp lên mạng xã hội theo hướng làm tổn hại uy tín của nhau.",
      "Nếu thương lượng không thành, tranh chấp được đưa ra Tòa án nhân dân có thẩm quyền theo quy định của Bộ luật Tố tụng dân sự 2015 để giải quyết. Phán quyết của Tòa án là chung thẩm và ràng buộc hai bên.",
    ],
  };
}

function artExtra(extra: ExtraTerm[]): DraftArticle {
  if (extra.length === 0) {
    return {
      title: "Điều khoản bổ sung của hai bên",
      items: [
        "Tại thời điểm ký, ngoài các điều khoản nêu trên hai bên không thỏa thuận thêm điều khoản riêng nào khác.",
        "Trong quá trình thực hiện, hai bên được bổ sung điều khoản mới bằng phụ lục ký theo hình thức quy định tại điều khoản về chữ ký điện tử.",
      ],
    };
  }
  return {
    title: "Điều khoản bổ sung của hai bên",
    items: [
      "Ngoài các điều khoản mẫu nêu trên, hai bên thống nhất bổ sung các điều khoản sau đây; các điều khoản này có giá trị ràng buộc ngang với mọi điều khoản còn lại của hợp đồng:",
      ...bullets(extra.map((t) => `${t.title}: ${t.body}`)),
      "Trường hợp một điều khoản bổ sung mâu thuẫn với điều khoản mẫu về cùng một vấn đề thì áp dụng điều khoản bổ sung, trừ các điều khoản về quy tắc nội dung, bảo vệ dữ liệu cá nhân và chữ ký điện tử — những nội dung này luôn được ưu tiên áp dụng theo bản mẫu.",
      "Các điều khoản bổ sung do Bên B soạn và đề xuất khi lập hợp đồng; Bên A đã đọc và chấp nhận bằng việc ký hợp đồng này.",
    ],
  };
}

function artGeneral(kind: ContractKind, minor: boolean, version: string): DraftArticle {
  return {
    title: "Điều khoản chung",
    items: [
      "Hai bên xác nhận đã đọc, hiểu rõ và tự nguyện giao kết hợp đồng; người ký có đủ năng lực hành vi dân sự và có thẩm quyền đại diện cho bên mình theo Điều 117 Bộ luật Dân sự 2015.",
      minor
        ? "Người ký của Bên B chưa đủ 18 tuổi. Việc giao kết hợp đồng này đã được người đại diện theo pháp luật của Bên B đồng ý theo khoản 3 và khoản 4 Điều 21 Bộ luật Dân sự 2015; thông tin người đại diện ghi tại phần đầu hợp đồng và người đại diện cùng chịu trách nhiệm về việc thực hiện hợp đồng."
        : "Người ký của Bên B xác nhận đã đủ 18 tuổi và có đầy đủ năng lực hành vi dân sự để tự mình xác lập, thực hiện hợp đồng này.",
      "Hợp đồng không làm phát sinh pháp nhân mới, quan hệ đại lý hay quan hệ đại diện giữa hai bên. Không bên nào được nhân danh bên còn lại để giao dịch hoặc nhận tiền của bên thứ ba ngoài phạm vi hợp đồng.",
      "Mọi thông báo giữa hai bên gửi qua email hoặc kênh liên lạc đã khai trong hợp đồng đều được coi là hợp lệ. Bên nào đổi đầu mối liên lạc phải báo cho bên còn lại trong 03 ngày.",
      "Hợp đồng được lập thành 02 bản điện tử có nội dung như nhau, mỗi bên giữ 01 bản, có giá trị pháp lý ngang nhau.",
      "Nếu một điều khoản bị coi là vô hiệu, các điều khoản còn lại vẫn giữ nguyên hiệu lực; hai bên thỏa thuận thay thế điều khoản vô hiệu bằng điều khoản hợp pháp có nội dung gần nhất.",
      `Hợp đồng áp dụng mẫu điều khoản phiên bản ${version} cho hình thức “${KIND_LABEL[kind]}”. Mã kiểm tra toàn vẹn SHA-256 của toàn văn được ghi kèm bản hợp đồng điện tử.`,
    ],
  };
}

// ── Bộ điều khoản của từng hình thức ─────────────────────────────────────────

function teamArticles(input: ContractInput, partyA: PartyA, minor: boolean): DraftArticle[] {
  const tierLabel = TIER_LABEL[input.tier];
  const paid = input.consideration.trim().length > 0;
  const notice = KIND_NOTICE_DAYS.team;

  return [
    {
      title: "Nội dung và phạm vi hợp tác",
      items: [
        `Hai bên là hai đội, nhóm hoạt động độc lập, cùng thống nhất hợp tác theo gói “${tierLabel}” trên nền tảng do Bên A vận hành, gồm website ${partyA.website} cùng các kênh cộng đồng và ứng dụng đi kèm.`,
        `Nội dung hợp tác cụ thể do hai bên thống nhất: ${dash(input.scope)}`,
        `Kênh, nền tảng của Bên B tham gia hợp tác: ${dash(input.channels)}`,
        "Hợp đồng này không làm phát sinh quan hệ lao động, quan hệ đại lý, liên doanh hay pháp nhân mới. Mỗi bên tự chịu trách nhiệm về hoạt động, nhân sự và nghĩa vụ tài chính của mình.",
        "Mọi nội dung hợp tác nằm ngoài phạm vi nêu trên phải được hai bên thống nhất bằng phụ lục.",
      ],
    },
    {
      title: "Thời hạn hợp tác",
      items: [
        `Thời hạn hợp tác: từ ${vnDateWords(input.term_start)} đến hết ${vnDateWords(input.term_end)}.`,
        `Trước khi hết hạn tối thiểu ${notice} ngày, bên nào muốn gia hạn phải thông báo cho bên còn lại bằng văn bản hoặc thông điệp dữ liệu. Việc gia hạn chỉ có hiệu lực khi cả hai bên chấp thuận.`,
        "Hết thời hạn mà hai bên không gia hạn, hệ thống của Bên A tự động ẩn thông tin đối tác của Bên B khỏi trang công khai và hợp đồng chấm dứt.",
      ],
    },
    {
      title: "Quyền lợi của Bên B — nghĩa vụ của Bên A",
      items: [
        "Trong thời hạn hợp đồng, Bên A bảo đảm cho Bên B các quyền lợi sau:",
        ...bullets(PACKAGE_BENEFITS[input.tier]),
        "Bên A có quyền biên tập nội dung theo tiêu chuẩn trình bày của mình, miễn không làm sai lệch thông tin của Bên B; có quyền từ chối đăng tải nội dung vi phạm điều khoản về quy tắc nội dung.",
        "Bên A tự chịu chi phí vận hành hạ tầng và nhân sự để thực hiện các quyền lợi nêu trên, trừ khoản chi phí riêng đã thỏa thuận tại điều khoản về giá trị hợp tác.",
        "Bên A thông báo cho Bên B trước tối thiểu 03 ngày khi có thay đổi ảnh hưởng tới các quyền lợi nêu trên.",
      ],
    },
    {
      title: "Quyền và nghĩa vụ của Bên B",
      items: [
        "Bên B có nghĩa vụ:",
        ...bullets([
          ...PACKAGE_DUTIES[input.tier],
          "Cung cấp thông tin trung thực, chính xác trong hợp đồng này và chịu trách nhiệm về thông tin đã cung cấp.",
          "Không nhân danh Bên A để phát ngôn, giao dịch hoặc thu tiền của bên thứ ba ngoài phạm vi hợp tác.",
          "Cử người đầu mối và phản hồi trao đổi của Bên A trong 03 ngày làm việc.",
        ]),
        "Bên B có quyền yêu cầu Bên A thực hiện đúng, đủ các quyền lợi đã cam kết; yêu cầu chỉnh sửa hoặc gỡ nội dung mô tả sai lệch về Bên B trong 03 ngày làm việc kể từ khi nhận yêu cầu hợp lý.",
        "Bên B có quyền yêu cầu Bên A cung cấp lại bản hợp đồng điện tử này bất kỳ lúc nào trong thời hạn lưu trữ.",
      ],
    },
    {
      title: "Giá trị hợp tác và thanh toán",
      items: [
        paid
          ? `Giá trị hợp tác và các khoản trao đổi giữa hai bên: ${input.consideration.trim()}`
          : "Hai bên hợp tác trên cơ sở trao đổi quyền lợi, không phát sinh khoản thanh toán bằng tiền. Trường hợp sau này phát sinh, hai bên lập phụ lục ghi rõ giá trị và tiến độ.",
        input.payment_terms.trim()
          ? `Phương thức và tiến độ thanh toán: ${input.payment_terms.trim()}`
          : "Không áp dụng do hai bên không phát sinh nghĩa vụ thanh toán tại thời điểm ký.",
        "Chi phí đi lại, sản xuất nội dung riêng của bên nào do bên đó tự chịu, trừ khi có thỏa thuận khác bằng phụ lục.",
        "Nếu phát sinh khoản chi trả bằng tiền, mỗi bên tự thực hiện nghĩa vụ thuế của mình theo pháp luật Việt Nam.",
      ],
    },
    {
      title: "Thương hiệu, nội dung và quyền sở hữu trí tuệ",
      items: [
        "Mỗi bên giữ nguyên quyền sở hữu đối với tên gọi, logo, nhận diện, nội dung và dữ liệu do mình tạo ra hoặc sở hữu hợp pháp.",
        "Trong thời hạn hợp đồng, mỗi bên cấp cho bên còn lại quyền sử dụng không độc quyền, không được chuyển nhượng lại đối với logo và tên gọi của mình, chỉ nhằm mục đích thực hiện hợp đồng này.",
        "Nội dung do hai bên phối hợp sản xuất thuộc sở hữu chung; việc khai thác thương mại nội dung đó phải có sự đồng ý của cả hai bên.",
        "Khi hợp đồng chấm dứt, quyền sử dụng nêu trên chấm dứt theo. Mỗi bên gỡ logo, tên gọi của bên còn lại khỏi kênh của mình trong 05 ngày làm việc, trừ nội dung đã đăng mang tính lưu trữ, ghi nhận lịch sử hợp tác.",
        "Bên nào cung cấp tư liệu xâm phạm quyền sở hữu trí tuệ của bên thứ ba thì bên đó chịu trách nhiệm giải quyết và bồi thường toàn bộ thiệt hại phát sinh cho bên còn lại.",
      ],
    },
    artContent("team", partyA),
    artPrivacy("team"),
    artESign(),
    {
      title: "Sửa đổi, tạm dừng và chấm dứt hợp đồng",
      items: [
        "Mọi sửa đổi, bổ sung phải lập thành phụ lục và được cả hai bên ký theo hình thức quy định tại điều khoản về chữ ký điện tử.",
        `Hợp đồng chấm dứt trong các trường hợp: hết thời hạn mà không gia hạn; hai bên thỏa thuận chấm dứt; một bên đơn phương chấm dứt và thông báo trước tối thiểu ${notice} ngày; một bên vi phạm quy tắc nội dung hoặc vi phạm nghiêm trọng nghĩa vụ hợp đồng mà không khắc phục trong 07 ngày kể từ khi nhận thông báo.`,
        "Khi chấm dứt, Bên A gỡ logo, liên kết và các nội dung quảng bá của Bên B khỏi trang công khai trong 05 ngày làm việc; hai bên quyết toán các nghĩa vụ tài chính đã phát sinh trong 15 ngày.",
        "Các điều khoản về sở hữu trí tuệ, bảo mật dữ liệu và giải quyết tranh chấp vẫn còn hiệu lực sau khi hợp đồng chấm dứt.",
      ],
    },
    artBreach("team"),
    artForceMajeure(),
    artDispute(),
    artExtra(input.extra_terms),
    artGeneral("team", minor, CONTRACT_TERMS_VERSION),
  ];
}

function memberArticles(input: ContractInput, partyA: PartyA, minor: boolean): DraftArticle[] {
  const paid = input.consideration.trim().length > 0;
  const notice = KIND_NOTICE_DAYS.member;
  const duties = input.duties.filter(Boolean);

  return [
    {
      title: "Vị trí, mảng phụ trách và phạm vi công việc",
      items: [
        `Bên B tham gia đội ngũ của Bên A với vai trò: ${dash(input.member_role)}.`,
        duties.length > 0
          ? `Mảng phụ trách: ${duties.join(", ")}.`
          : "Mảng phụ trách do hai bên thống nhất trong quá trình làm việc và ghi nhận trên trang Đội ngũ của Bên A.",
        `Phạm vi công việc cụ thể: ${dash(input.scope)}`,
        input.commitment.trim()
          ? `Mức cam kết của Bên B: ${input.commitment.trim()}`
          : "Hai bên không đặt định mức thời gian cố định; Bên B nhận việc theo khả năng và thống nhất tiến độ cho từng đầu việc.",
        "Việc ngoài phạm vi trên chỉ thực hiện khi Bên B đồng ý; Bên B có quyền từ chối đầu việc không thuộc mảng mình phụ trách mà không bị coi là vi phạm hợp đồng.",
      ],
    },
    {
      title: "Quan hệ giữa hai bên — không phải quan hệ lao động",
      items: [
        "Đây là hợp tác cộng đồng tự nguyện giữa một cá nhân và một đội ngũ vận hành cộng đồng. Hợp đồng này KHÔNG phải hợp đồng lao động và không làm phát sinh quan hệ lao động theo Bộ luật Lao động 2019.",
        "Hai bên không đặt ra tiền lương, chấm công, bảo hiểm xã hội, bảo hiểm y tế hay chế độ nghỉ phép. Bên A không có quyền điều động Bên B làm việc ngoài phạm vi và mức cam kết đã ghi.",
        "Khoản hỗ trợ, thù lao hoặc phần thưởng (nếu có) được ghi rõ tại điều khoản về hỗ trợ và thù lao, mang tính ghi nhận đóng góp, không phải tiền lương.",
        "Bên B tự chịu trách nhiệm về nghĩa vụ thuế đối với khoản thu nhập nhận được (nếu có) theo pháp luật Việt Nam.",
      ],
    },
    {
      title: "Thời hạn tham gia",
      items: [
        `Thời hạn tham gia: từ ${vnDateWords(input.term_start)} đến hết ${vnDateWords(input.term_end)}.`,
        "30 ngày đầu là thời gian làm quen: trong khoảng này, mỗi bên được dừng hợp tác bằng thông báo trước 03 ngày mà không cần nêu lý do.",
        "Trước khi hết hạn tối thiểu 07 ngày, bên nào muốn tiếp tục phải báo cho bên còn lại. Hai bên cùng đồng ý thì lập hợp đồng mới hoặc phụ lục gia hạn.",
        "Bên B được tạm dừng tham gia vì lý do học tập, sức khỏe hoặc việc riêng, với điều kiện báo trước 03 ngày và bàn giao phần việc đang dở.",
      ],
    },
    {
      title: "Quyền lợi của Bên B — nghĩa vụ của Bên A",
      items: [
        "Trong thời gian tham gia, Bên A bảo đảm cho Bên B các quyền lợi sau:",
        ...bullets(MEMBER_BENEFITS),
        "Bên A không được lấy nội dung do Bên B sản xuất đăng dưới tên người khác, cũng không được xóa tên tác giả khỏi nội dung đã đăng.",
        "Bên A báo trước cho Bên B ít nhất 03 ngày khi thay đổi vai trò, quyền hạn hoặc mảng phụ trách của Bên B, trừ trường hợp phải thu hồi quyền khẩn cấp vì lý do an toàn hệ thống.",
      ],
    },
    {
      title: "Nghĩa vụ của Bên B",
      items: [
        "Bên B có nghĩa vụ:",
        ...bullets(MEMBER_DUTIES),
        "Bên B cung cấp thông tin trung thực trong hợp đồng này và cập nhật khi có thay đổi về kênh liên lạc.",
      ],
    },
    {
      title: "Hỗ trợ và thù lao",
      items: [
        paid
          ? `Mức hỗ trợ, thù lao hoặc phần thưởng hai bên thống nhất: ${input.consideration.trim()}`
          : "Hai bên hợp tác trên tinh thần cộng đồng, không phát sinh khoản chi trả bằng tiền tại thời điểm ký. Nếu sau này phát sinh, hai bên ghi rõ bằng phụ lục.",
        input.payment_terms.trim()
          ? `Cách thức và kỳ hạn chi trả: ${input.payment_terms.trim()}`
          : "Không áp dụng do hai bên không phát sinh khoản chi trả tại thời điểm ký.",
        "Chi phí do Bên B tự bỏ ra để thực hiện công việc chỉ được hoàn lại khi có thống nhất trước với Bên A.",
      ],
    },
    {
      title: "Tài khoản, quyền truy cập và an toàn dữ liệu",
      items: [
        "Bên A cấp cho Bên B quyền truy cập ở mức tối thiểu đủ để làm công việc được giao và thu hồi ngay khi công việc đó kết thúc.",
        "Bên B không chia sẻ tài khoản, không dùng chung mật khẩu, không đăng nhập hộ người khác vào hệ thống của Bên A.",
        "Bên B không sao chép, chụp màn hình hay mang ra ngoài dữ liệu người dùng (thông tin tài khoản, email, số điện thoại, nội dung riêng tư) cho mục đích ngoài công việc được giao.",
        "Khi phát hiện lộ lọt tài khoản hoặc sự cố an toàn thông tin, Bên B báo cho Bên A ngay trong 24 giờ.",
        "Khi rời đội, Bên B bàn giao lại công việc đang dở, tài liệu và mọi quyền truy cập trong 03 ngày làm việc; Bên A thu hồi quyền và huy hiệu vai trò tương ứng.",
      ],
    },
    {
      title: "Nội dung, bản quyền và ghi nhận tác giả",
      items: [
        "Nội dung Bên B sản xuất trong khuôn khổ hợp đồng này (bài viết, hình ảnh, video, thiết kế, mã nguồn) được đăng trên nền tảng của Bên A và luôn ghi nhận Bên B là tác giả.",
        "Bên B cấp cho Bên A quyền sử dụng, biên tập, đăng tải và lưu trữ nội dung đó trên các kênh của Bên A, không giới hạn thời gian, kể cả sau khi Bên B rời đội — để nội dung đã đăng không bị đứt gãy với người đọc.",
        "Bên B giữ quyền tác giả và được sử dụng lại nội dung của mình cho mục đích cá nhân, hồ sơ năng lực, với điều kiện ghi rõ nội dung đó được thực hiện trong thời gian hợp tác với Bên A.",
        "Bên B bảo đảm nội dung mình đăng không xâm phạm quyền tác giả của bên thứ ba; nếu có tranh chấp, Bên B chịu trách nhiệm giải quyết và bồi thường thiệt hại cho Bên A.",
        "Bên A có quyền biên tập, tạm ẩn hoặc gỡ nội dung không phù hợp với tiêu chuẩn nội dung của mình, và thông báo lý do cho Bên B.",
      ],
    },
    artContent("member", partyA),
    artPrivacy("member"),
    artESign(),
    {
      title: "Tạm dừng, rời đội và chấm dứt hợp đồng",
      items: [
        "Mọi sửa đổi, bổ sung phải lập thành phụ lục và được cả hai bên ký theo hình thức quy định tại điều khoản về chữ ký điện tử.",
        `Hợp đồng chấm dứt khi: hết thời hạn mà không gia hạn; hai bên thỏa thuận chấm dứt; một bên đơn phương chấm dứt và thông báo trước tối thiểu ${notice} ngày; hoặc Bên B vi phạm nghiêm trọng nghĩa vụ nêu trong hợp đồng.`,
        "Bên B rời đội không bị coi là vi phạm nếu đã thông báo đúng hạn và bàn giao đầy đủ. Bên A ghi nhận đóng góp của Bên B và giữ tên Bên B trong phần ghi công của các nội dung đã đăng.",
        "Khi chấm dứt, Bên A gỡ Bên B khỏi trang Đội ngũ công khai, thu hồi quyền truy cập và huy hiệu vai trò trong 03 ngày làm việc.",
        "Các điều khoản về bản quyền, bảo mật dữ liệu và giải quyết tranh chấp vẫn còn hiệu lực sau khi hợp đồng chấm dứt.",
      ],
    },
    artBreach("member"),
    artForceMajeure(),
    artDispute(),
    artExtra(input.extra_terms),
    artGeneral("member", minor, CONTRACT_TERMS_VERSION),
  ];
}

function techArticles(input: ContractInput, partyA: PartyA, minor: boolean): DraftArticle[] {
  const paid = input.consideration.trim().length > 0;
  const notice = KIND_NOTICE_DAYS.tech;

  return [
    {
      title: "Phạm vi hợp tác kỹ thuật",
      items: [
        `Bên B nhận thực hiện, hỗ trợ hoặc cung cấp hạng mục kỹ thuật cho hệ thống của Bên A, gồm website ${partyA.website}, ứng dụng di động và các dịch vụ đi kèm.`,
        `Hạng mục kỹ thuật cụ thể: ${dash(input.scope)}`,
        input.deliverables.trim()
          ? `Sản phẩm bàn giao và mốc thời gian: ${input.deliverables.trim()}`
          : "Sản phẩm bàn giao và mốc thời gian do hai bên thống nhất bằng văn bản trước khi bắt đầu từng hạng mục.",
        "Yêu cầu kỹ thuật phát sinh ngoài phạm vi trên được coi là hạng mục mới, hai bên thống nhất lại thời gian và chi phí trước khi thực hiện.",
        "Hợp đồng này không làm phát sinh quan hệ lao động; Bên B chủ động về cách thức, công cụ và thời gian làm việc, miễn bảo đảm tiến độ đã cam kết.",
      ],
    },
    {
      title: "Thời hạn và nghiệm thu",
      items: [
        `Thời hạn hợp tác: từ ${vnDateWords(input.term_start)} đến hết ${vnDateWords(input.term_end)}.`,
        "Bên B thông báo khi hoàn tất một hạng mục. Bên A nghiệm thu và phản hồi trong 05 ngày làm việc; quá thời hạn này mà không phản hồi thì hạng mục được coi là đã nghiệm thu.",
        "Lỗi phát hiện trong quá trình nghiệm thu được Bên B sửa miễn phí. Yêu cầu thay đổi so với mô tả ban đầu được tính là hạng mục mới.",
        "Bên B bảo hành phần mình bàn giao trong 30 ngày kể từ ngày nghiệm thu, trừ khi hai bên thỏa thuận thời hạn khác tại điều khoản bổ sung.",
      ],
    },
    {
      title: "Quyền lợi của Bên B — nghĩa vụ của Bên A",
      items: [
        "Bên A bảo đảm cho Bên B các quyền lợi sau:",
        ...bullets(TECH_BENEFITS),
        "Bên A không yêu cầu Bên B thực hiện thay đổi gấp ngoài giờ nếu không có thỏa thuận riêng, trừ sự cố làm hệ thống ngừng hoạt động.",
      ],
    },
    {
      title: "Nghĩa vụ của Bên B",
      items: [
        "Bên B có nghĩa vụ:",
        ...bullets(TECH_DUTIES),
        "Bên B thông báo cho Bên A trước 05 ngày khi không thể tiếp tục một hạng mục, kèm phần việc đã làm và trạng thái hiện tại.",
      ],
    },
    {
      title: "Mức hỗ trợ và xử lý sự cố",
      items: [
        input.sla.trim()
          ? `Mức hỗ trợ hai bên thống nhất: ${input.sla.trim()}`
          : "Hai bên không đặt cam kết thời gian phản hồi cố định; Bên B hỗ trợ trong khả năng và ưu tiên xử lý sự cố nghiêm trọng.",
        "Sự cố làm hệ thống ngừng hoạt động hoặc mất dữ liệu được ưu tiên cao nhất; Bên B phản hồi ngay khi nhận được thông báo và cùng Bên A khắc phục.",
        "Sau mỗi sự cố nghiêm trọng, Bên B gửi cho Bên A tóm tắt nguyên nhân và cách phòng ngừa lặp lại.",
        "Bên A cung cấp quyền truy cập, nhật ký hệ thống và thông tin cần thiết để Bên B xử lý sự cố.",
      ],
    },
    {
      title: "Chi phí và thanh toán",
      items: [
        paid
          ? `Giá trị hợp tác: ${input.consideration.trim()}`
          : "Hai bên hợp tác trên cơ sở hỗ trợ lẫn nhau, không phát sinh chi phí tại thời điểm ký. Nếu sau này phát sinh, hai bên ghi rõ bằng phụ lục trước khi thực hiện.",
        input.payment_terms.trim()
          ? `Phương thức và tiến độ thanh toán: ${input.payment_terms.trim()}`
          : "Không áp dụng do hai bên không phát sinh nghĩa vụ thanh toán tại thời điểm ký.",
        "Chi phí dịch vụ bên thứ ba (máy chủ, tên miền, khóa API trả phí) do Bên A chi trả trực tiếp, trừ khi hai bên thỏa thuận khác.",
        "Nếu phát sinh khoản chi trả bằng tiền, mỗi bên tự thực hiện nghĩa vụ thuế của mình theo pháp luật Việt Nam.",
      ],
    },
    {
      title: "Quyền sở hữu sản phẩm và bàn giao",
      items: [
        `Hai bên thống nhất phương án: ${IP_OWNERSHIP_LABEL[input.ip_ownership]}.`,
        IP_OWNERSHIP_CLAUSE[input.ip_ownership],
        "Thư viện mã nguồn mở và công cụ sẵn có mà Bên B sử dụng vẫn theo giấy phép gốc của chúng; Bên B bảo đảm các giấy phép này cho phép Bên A sử dụng trong hoạt động của mình.",
        "Bên B bàn giao mã nguồn, tài liệu hướng dẫn, thông tin cấu hình và tài khoản dịch vụ liên quan chậm nhất 07 ngày sau khi hoàn tất hạng mục hoặc khi hợp đồng chấm dứt.",
        "Bên B bảo đảm sản phẩm bàn giao không xâm phạm quyền sở hữu trí tuệ của bên thứ ba và chịu trách nhiệm nếu có tranh chấp phát sinh từ phần mình làm.",
      ],
    },
    {
      title: "Truy cập hệ thống và an toàn thông tin",
      items: [
        "Bên A cấp cho Bên B quyền truy cập ở mức tối thiểu cần thiết, có thời hạn, và thu hồi ngay khi hạng mục kết thúc.",
        "Bên B không tạo thêm tài khoản, khóa truy cập hay đường vào hệ thống nằm ngoài những gì Bên A đã cấp; không để lại bất kỳ cơ chế truy cập nào sau khi bàn giao.",
        "Bên B không sao lưu, sao chép dữ liệu người dùng của Bên A ra môi trường ngoài hệ thống của Bên A. Khi buộc phải dùng dữ liệu thật để xử lý sự cố, Bên B chỉ dùng trong phạm vi cần thiết và xóa ngay sau khi xong.",
        "Đối với dữ liệu cá nhân của người dùng, Bên B chỉ xử lý theo yêu cầu và trong phạm vi Bên A ủy quyền, đúng Nghị định 13/2023/NĐ-CP; Bên A là bên kiểm soát dữ liệu.",
        "Khi phát hiện lộ lọt dữ liệu hoặc lỗ hổng an toàn, Bên B báo cho Bên A trong 24 giờ và không công bố ra bên ngoài trước khi lỗ hổng được vá.",
      ],
    },
    artContent("tech", partyA),
    artPrivacy("tech"),
    artESign(),
    {
      title: "Sửa đổi, chấm dứt và bàn giao khi kết thúc",
      items: [
        "Mọi sửa đổi, bổ sung phải lập thành phụ lục và được cả hai bên ký theo hình thức quy định tại điều khoản về chữ ký điện tử.",
        `Hợp đồng chấm dứt khi: hết thời hạn mà không gia hạn; hai bên thỏa thuận chấm dứt; một bên đơn phương chấm dứt và thông báo trước tối thiểu ${notice} ngày; hoặc một bên vi phạm nghiêm trọng nghĩa vụ mà không khắc phục trong 07 ngày.`,
        "Khi chấm dứt, Bên B hoàn tất bàn giao theo điều khoản về quyền sở hữu sản phẩm; Bên A thu hồi toàn bộ quyền truy cập đã cấp và quyết toán phần chi phí tương ứng với khối lượng đã nghiệm thu.",
        "Bên B tiếp tục hỗ trợ Bên A trong 07 ngày sau khi chấm dứt để bàn giao trơn tru, trừ trường hợp chấm dứt do Bên A vi phạm.",
        "Các điều khoản về quyền sở hữu sản phẩm, an toàn thông tin, bảo mật và giải quyết tranh chấp vẫn còn hiệu lực sau khi hợp đồng chấm dứt.",
      ],
    },
    {
      title: "Trách nhiệm và giới hạn trách nhiệm",
      items: [
        "Bên B chịu trách nhiệm với lỗi thuộc phần mình bàn giao và phải khắc phục trong thời gian bảo hành.",
        "Bên B không chịu trách nhiệm với sự cố do Bên A hoặc bên thứ ba tự thay đổi mã nguồn, cấu hình, hoặc do dịch vụ bên thứ ba ngừng hoạt động.",
        "Trừ trường hợp cố ý hoặc vi phạm nghĩa vụ an toàn thông tin, trách nhiệm bồi thường của mỗi bên giới hạn ở thiệt hại thực tế, trực tiếp và không vượt quá tổng giá trị hợp đồng; hợp đồng không phát sinh chi phí thì hai bên khắc phục hậu quả bằng công sức thay cho bồi thường bằng tiền.",
        "Không bên nào chịu trách nhiệm về khoản lợi nhuận mất đi hoặc thiệt hại gián tiếp của bên còn lại.",
      ],
    },
    artBreach("tech"),
    artForceMajeure(),
    artDispute(),
    artExtra(input.extra_terms),
    artGeneral("tech", minor, CONTRACT_TERMS_VERSION),
  ];
}

// ── Dựng toàn văn ────────────────────────────────────────────────────────────

const PARTY_A_HEADING: Record<ContractKind, string> = {
  team: "BÊN A (ĐỘI MỜI HỢP TÁC)",
  member: "BÊN A (ĐỘI TIẾP NHẬN THÀNH VIÊN)",
  tech: "BÊN A (BÊN ĐẶT HẠNG MỤC KỸ THUẬT)",
};

const PARTY_B_HEADING: Record<ContractKind, string> = {
  team: "BÊN B (ĐỘI / CỘNG ĐỒNG ĐỐI TÁC)",
  member: "BÊN B (THÀNH VIÊN)",
  tech: "BÊN B (ĐỐI TÁC KỸ THUẬT)",
};

/**
 * Dựng toàn văn hợp đồng từ dữ liệu Bên B + thông tin Bên A.
 * `signDate` là ngày lập (ISO yyyy-mm-dd) — lúc xem trước thì lấy hôm nay.
 */
export function buildContractDocument(
  input: ContractInput,
  partyA: PartyA,
  meta: { code: string; signDate: string },
): ContractDocument {
  const kind = input.kind;
  const partyType = partyTypeFor(kind, input.party_type);
  const asTeam = partyType === "team";

  // Tính theo NGÀY KÝ, không phải hôm nay: người ký lúc 17 tuổi rồi sang tuổi
  // 18 thì hợp đồng vẫn phải là bản có người đại diện, dựng lại mới khớp mã băm.
  const minor = isMinor(input.date_of_birth, new Date(`${meta.signDate}T00:00:00Z`));

  const contactLines: ContractLine[] = [
    ["Điện thoại", dash(input.phone)],
    ["Email", dash(input.email)],
    ["Kênh liên lạc", dash(input.contact_link)],
  ];

  const partyBLines: ContractLine[] = asTeam
    ? [
        ["Tên đội / cộng đồng", dash(input.team_name)],
        ...(input.team_tag ? ([["Tên viết tắt", input.team_tag]] as ContractLine[]) : []),
        ...(input.team_size ? ([["Quy mô", input.team_size]] as ContractLine[]) : []),
        ["Người đại diện", dash(input.full_name)],
        ...(input.display_name ? ([["Biệt danh", input.display_name]] as ContractLine[]) : []),
        ["Vai trò trong đội", dash(input.rep_title)],
        ...(input.date_of_birth ? ([["Ngày sinh người đại diện", vnDate(input.date_of_birth)]] as ContractLine[]) : []),
        ...contactLines,
        ...(input.area ? ([["Khu vực hoạt động", input.area]] as ContractLine[]) : []),
        ["Kênh / nền tảng", dash(input.channels)],
      ]
    : [
        ["Họ và tên", dash(input.full_name)],
        ["Biệt danh / tên trong cộng đồng", dash(input.display_name)],
        ...(input.date_of_birth ? ([["Ngày sinh", vnDate(input.date_of_birth)]] as ContractLine[]) : []),
        ...(input.game_uid ? ([["UID Free Fire", input.game_uid]] as ContractLine[]) : []),
        ...contactLines,
        ...(input.area ? ([["Khu vực", input.area]] as ContractLine[]) : []),
        ...(input.channels ? ([["Kênh / nền tảng", input.channels]] as ContractLine[]) : []),
      ];

  const partyALines: ContractLine[] = [
    ["Tên đội ngũ", dash(partyA.name)],
    ...(partyA.legalForm ? ([["Tư cách", partyA.legalForm]] as ContractLine[]) : []),
    ["Khu vực hoạt động", dash(partyA.address)],
    ["Website", dash(partyA.website)],
    ["Email", dash(partyA.email)],
    ...(partyA.phone ? ([["Điện thoại", partyA.phone]] as ContractLine[]) : []),
    ["Người đại diện", dash(partyA.repName)],
    ["Vai trò", dash(partyA.repTitle)],
  ];

  const guardian = minor
    ? {
        heading: "NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT CỦA NGƯỜI KÝ (chưa đủ 18 tuổi)",
        lines: [
          ["Họ và tên", dash(input.guardian_name)],
          ["Quan hệ với người ký", dash(input.guardian_relation)],
          ["Điện thoại", dash(input.guardian_phone)],
        ] as ContractLine[],
      }
    : null;

  const drafts =
    kind === "member"
      ? memberArticles(input, partyA, minor)
      : kind === "tech"
        ? techArticles(input, partyA, minor)
        : teamArticles(input, partyA, minor);

  const title =
    kind === "team" ? `${KIND_DOC_TITLE.team} — ${TIER_LABEL[input.tier].toUpperCase()}` : KIND_DOC_TITLE[kind];

  return {
    title,
    code: meta.code,
    signPlaceDate: `Hôm nay, ${vnDateWords(meta.signDate)}, hai bên gồm:`,
    bases: LEGAL_BASES_BY_KIND[kind],
    partyA: { heading: PARTY_A_HEADING[kind], lines: partyALines },
    partyB: { heading: `${PARTY_B_HEADING[kind]} — ${PARTY_TYPE_LABEL[partyType].toUpperCase()}`, lines: partyBLines },
    guardian,
    articles: numberArticles(drafts),
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
  const kind = isContractKind(row.kind) ? row.kind : "team";
  const partyType = row.party_type === "team" ? "team" : row.party_type === "person" ? "person" : null;
  return {
    kind,
    party_type: partyType ?? KIND_FORCED_PARTY[kind] ?? "person",
    full_name: s(row.full_name),
    display_name: s(row.display_name),
    date_of_birth: s(row.date_of_birth),
    game_uid: s(row.game_uid),
    email: s(row.email),
    phone: s(row.phone),
    contact_link: s(row.contact_link),
    area: s(row.area),
    team_name: s(row.team_name),
    team_tag: s(row.team_tag),
    team_size: s(row.team_size),
    rep_title: s(row.rep_title),
    channels: s(row.channels),
    guardian_name: s(row.guardian_name),
    guardian_relation: s(row.guardian_relation),
    guardian_phone: s(row.guardian_phone),
    tier: row.tier ?? "community",
    member_role: s(row.member_role),
    duties: Array.isArray(row.duties) ? row.duties.filter((d): d is string => typeof d === "string") : [],
    commitment: s(row.commitment),
    deliverables: s(row.deliverables),
    sla: s(row.sla),
    ip_ownership: (IP_OWNERSHIP_OPTIONS as readonly string[]).includes(row.ip_ownership ?? "")
      ? (row.ip_ownership as IpOwnership)
      : "arex",
    scope: s(row.scope),
    term_start: s(row.term_start),
    term_end: s(row.term_end),
    consideration: s(row.consideration),
    payment_terms: s(row.payment_terms),
    extra_terms: normalizeExtraTerms(row.extra_terms),
  };
}

/** Ngày (yyyy-mm-dd) theo giờ Việt Nam của một mốc thời gian ISO. */
export function vnIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
