// Tier list nhân vật Free Fire — dữ liệu do cộng đồng đánh giá (chế độ Sinh Tồn).
// Chỉ mang tính tham khảo, meta thay đổi theo mùa.
//
// Ảnh chân dung lấy từ kho icon chính chủ qua proxy /api/ff-icon/<itemId>.png
// (xem lib/data/ff-icons.ts). Trước đây file này trỏ vào bucket Storage
// `ff-items/characters/` — bucket đó chưa từng có file nào nên mọi ảnh đều vỡ.

import { iconUrl } from "@/lib/data/ff-icons";

export type CharRole = "rush" | "support" | "heal" | "mobility" | "defense" | "info";
export type Tier = "S" | "A" | "B" | "C" | "D";

export type FFCharacter = {
  name: string;
  tier: Tier;
  role: CharRole;
  skill: string; // tên + mô tả ngắn kỹ năng
  /** ID vật phẩm Free Fire — dùng lấy ảnh chân dung chính chủ. */
  itemId?: string;
  /** Bản thức tỉnh của nhân vật nào (tên gốc). */
  awakenedOf?: string;
  image?: string; // URL ảnh chân dung (tùy chọn; ghi đè itemId)
};

// Slug tên file ảnh: chữ thường, bỏ ký tự đặc biệt (vd "D-bee" -> "dbee")
export function charSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type SkillType = "active" | "passive";

// Nhân vật có kỹ năng CHỦ ĐỘNG (có hồi chiêu). Còn lại là bị động.
export const ACTIVE_SKILL_NAMES = new Set<string>([
  "Alok", "K", "Dimitri", "Skyler", "Chrono", "Wukong", "Xayne", "A124", "Steffie", "Rafael",
  "Iris", "Kenta", "Homer", "Tatsuya", "Santino", "Nairi", "Clu", "Orion", "Alvaro",
]);

export function skillType(name: string): SkillType {
  return ACTIVE_SKILL_NAMES.has(name) ? "active" : "passive";
}

export const TIER_ORDER: Tier[] = ["S", "A", "B", "C", "D"];

export const TIER_META: Record<Tier, { label: string; text: string; ring: string; bar: string }> = {
  S: { label: "Cực mạnh",   text: "text-amber-500 dark:text-amber-400",   ring: "ring-amber-400/40",   bar: "from-amber-400 to-orange-500" },
  A: { label: "Mạnh",        text: "text-orange-500 dark:text-orange-400", ring: "ring-orange-400/40",   bar: "from-orange-400 to-red-400" },
  B: { label: "Khá",         text: "text-sky-500 dark:text-sky-400",       ring: "ring-sky-400/40",      bar: "from-sky-400 to-blue-500" },
  C: { label: "Trung bình",  text: "text-emerald-500 dark:text-emerald-400", ring: "ring-emerald-400/40", bar: "from-emerald-400 to-teal-500" },
  D: { label: "Yếu",         text: "text-zinc-400 dark:text-zinc-500",     ring: "ring-zinc-400/30",     bar: "from-zinc-300 to-zinc-400" },
};

export const ROLE_META: Record<CharRole, { label: string; text: string; bg: string }> = {
  rush:     { label: "Áp sát",    text: "text-red-500",     bg: "bg-red-500/12" },
  support:  { label: "Hỗ trợ",    text: "text-violet-500",  bg: "bg-violet-500/12" },
  heal:     { label: "Hồi máu",   text: "text-emerald-500", bg: "bg-emerald-500/12" },
  mobility: { label: "Cơ động",   text: "text-sky-500",     bg: "bg-sky-500/12" },
  defense:  { label: "Phòng thủ", text: "text-blue-500",    bg: "bg-blue-500/12" },
  info:     { label: "Trinh sát", text: "text-amber-500",   bg: "bg-amber-500/12" },
};

export const FF_CHARACTERS: FFCharacter[] = [
  // ── S ──
  { name: "Alok",    itemId: "102000015", tier: "S", role: "heal",     skill: "Drop the Beat — tạo vùng hồi máu + tăng tốc chạy." },
  { name: "K",       itemId: "102000022", tier: "S", role: "support",  skill: "Master of All — hồi EP nhanh, chuyển EP thành HP." },
  { name: "Dimitri", itemId: "102000031", tier: "S", role: "heal",     skill: "Healing Heartbeat — vùng hồi máu, tự đứng dậy khi gục." },
  { name: "Skyler",  itemId: "102000025", tier: "S", role: "rush",     skill: "Riptide Rhythm — phá gloo wall, hồi máu theo tường đã đặt." },
  { name: "Xayne",   itemId: "101000022", tier: "S", role: "rush",     skill: "Xtreme Encounter — cộng HP tạm thời, tăng sát thương gloo/khiên." },
  { name: "Wukong",  itemId: "102000011", tier: "S", role: "mobility", skill: "Camouflage — biến thành bụi cây khi đứng yên." },

  // ── A ──
  { name: "Chrono",   itemId: "102000024", tier: "A", role: "defense",  skill: "Time Turner — khiên chắn đạn tạm thời." },
  { name: "Jota",     itemId: "102000017", tier: "A", role: "rush",     skill: "Sustained Raids — hồi máu khi hạ gục địch bằng súng." },
  { name: "Hayato",   itemId: "102000012", tier: "A", role: "rush",     skill: "Bushido — càng ít giáp càng xuyên giáp mạnh." },
  { name: "D-bee",    itemId: "102000029", tier: "A", role: "rush",     skill: "Bullet Beats — tăng tốc & độ chính xác khi vừa chạy vừa bắn." },
  { name: "Steffie",  itemId: "101000017", tier: "A", role: "support",  skill: "Painting Fearless — graffiti giảm sát thương đạn & nổ." },
  { name: "Shirou",   itemId: "102000026", tier: "A", role: "info",     skill: "Damage Delivered — đánh dấu kẻ bắn mình, tăng xuyên giáp." },
  { name: "Joseph",   itemId: "102000014", tier: "A", role: "mobility", skill: "Nutty Movement — tăng tốc chạy khi bị trúng đạn." },
  { name: "Kapella",  itemId: "101000018", tier: "A", role: "heal",     skill: "Healing Song — tăng hiệu quả hồi máu, giảm mất máu khi gục." },
  { name: "A124",     itemId: "101000013", tier: "A", role: "support",  skill: "Thrill of Battle — chuyển EP thành HP nhanh." },
  { name: "Wolfrahh", itemId: "102000019", tier: "A", role: "defense",  skill: "Limelight — giảm sát thương chí mạng nhận vào." },
  { name: "Iris",     itemId: "101000025", tier: "A", role: "defense",  skill: "Wall Shield — dựng tường chắn đạn, nhìn xuyên tường khi đứng sau." },
  { name: "Kenta",    itemId: "102000036", tier: "A", role: "defense",  skill: "Swordsman Laws — khiên chắn phía trước, giảm sát thương nhận vào." },
  { name: "Orion",    itemId: "102000041", tier: "A", role: "rush",     skill: "Crimson Bloodbath — hút HP của địch trong vùng, tăng HP tối đa." },

  // ── B ──
  { name: "Kelly",   itemId: "101000006", tier: "B", role: "mobility", skill: "Dash — tăng tốc độ chạy." },
  { name: "Moco",    itemId: "101000011", tier: "B", role: "info",     skill: "Hacker's Eye — đánh dấu địch bị bắn trúng." },
  { name: "Laura",   itemId: "101000012", tier: "B", role: "rush",     skill: "Sharp Shooter — tăng chính xác khi ngắm bắn." },
  { name: "Miguel",  itemId: "102000009", tier: "B", role: "support",  skill: "Crazy Slayer — nhận EP mỗi lần hạ gục." },
  { name: "Luqueta", itemId: "102000018", tier: "B", role: "rush",     skill: "Hat Trick — tăng HP tối đa mỗi lần hạ gục." },
  { name: "Rafael",  itemId: "102000013", tier: "B", role: "info",     skill: "Dead Silent — bắn tỉa/SMG giảm tiếng, địch mất máu nhanh hơn." },
  { name: "Shani",   itemId: "101000014", tier: "B", role: "defense",  skill: "Gear Recycle — hồi giáp khi hạ gục địch." },
  { name: "Dasha",   itemId: "101000020", tier: "B", role: "mobility", skill: "Partying On — giảm giật, giảm sát thương ngã." },
  { name: "Thiva",   itemId: "102000030", tier: "B", role: "support",  skill: "Vital Vibes — cứu đồng đội nhanh hơn, tự hồi khi không bị bắn." },
  { name: "Nairi",   itemId: "102000034", tier: "B", role: "defense",  skill: "Ice Iron — tăng độ bền gloo wall và tự vá tường đã hỏng." },
  { name: "Leon",    itemId: "102000032", tier: "B", role: "defense",  skill: "Buzzer Beater — hồi thêm HP sau khi sống sót qua một pha giao tranh." },
  { name: "Maro",    itemId: "102000028", tier: "B", role: "info",     skill: "Falcon Fervor — địch càng xa sát thương càng cao, đánh dấu địch trúng đạn lâu hơn." },
  { name: "Homer",   itemId: "102000037", tier: "B", role: "info",     skill: "Locked and Loaded — ném bom cảm ứng, lộ vị trí địch dính bom." },
  { name: "Tatsuya", itemId: "102000039", tier: "B", role: "mobility", skill: "Rapid Movements — lướt nhanh về phía trước, tăng tốc khi vừa chạy vừa bắn." },
  { name: "Santino", itemId: "102000040", tier: "B", role: "mobility", skill: "Trickster — mở cổng dịch chuyển tới vị trí đã đánh dấu." },
  { name: "Alvaro",  itemId: "102000016", tier: "B", role: "support",  skill: "Art of Demolition — tăng sát thương và tầm nổ của vật ném." },
  { name: "Jai",     itemId: "102000021", tier: "B", role: "support",  skill: "Raging Reload — tự nạp lại một phần băng đạn sau khi hạ gục." },

  // ── C ──
  { name: "Kla",     itemId: "102000008", tier: "C", role: "rush",     skill: "Muay Thai — tăng sát thương đấm tay không." },
  { name: "Nikita",  itemId: "101000007", tier: "C", role: "rush",     skill: "Firearms Expert — nạp đạn SMG nhanh hơn." },
  { name: "Caroline",itemId: "101000010", tier: "C", role: "mobility", skill: "Agility — tăng tốc chạy khi cầm shotgun." },
  { name: "Paloma",  itemId: "101000009", tier: "C", role: "support",  skill: "Arms-dealing — mang đạn AR không tính vào túi đồ." },
  { name: "Andrew",  itemId: "102000005", tier: "C", role: "defense",  skill: "Armor Specialist — giảm độ hao mòn của áo giáp." },
  { name: "Olivia",  itemId: "101000005", tier: "C", role: "heal",     skill: "Healing Touch — hồi thêm HP khi cứu đồng đội." },
  { name: "Ford",    itemId: "102000006", tier: "C", role: "defense",  skill: "Iron Will — giảm sát thương khi ở ngoài vùng an toàn." },
  { name: "Maxim",   itemId: "102000007", tier: "C", role: "support",  skill: "Gluttony — ăn nấm/dùng vật phẩm nhanh hơn." },
  { name: "Clu",     itemId: "101000019", tier: "C", role: "info",     skill: "Tracing Steps — lộ vị trí địch đang đứng yên trong tầm." },

  // ── D ──
  { name: "Otho",   itemId: "102000033", tier: "D", role: "info",     skill: "Memory Mist — lộ vị trí địch tiếp theo khi hạ gục." },
  { name: "Notora", itemId: "101000016", tier: "D", role: "support",  skill: "Racer's Blessing — hồi máu cả đội khi ngồi trên xe." },
  { name: "Misha",  itemId: "101000008", tier: "D", role: "mobility", skill: "Afterburner — tăng tốc độ lái xe, giảm sát thương khi trên xe." },
  { name: "Antonio",itemId: "102000010", tier: "D", role: "defense",  skill: "Gangster's Spirit — tăng HP khởi đầu mỗi trận." },

  // ── Bản thức tỉnh ──
  // Cùng nhân vật gốc nhưng đổi hẳn kỹ năng, nên đứng riêng trong thư viện.
  { name: "Kelly the Swift",  itemId: "101000015", awakenedOf: "Kelly",  tier: "A", role: "mobility", skill: "Deadly Velocity — chạy đủ lâu thì phát bắn đầu tiên cộng thêm sát thương." },
  { name: "Hayato Firebrand", itemId: "102000020", awakenedOf: "Hayato", tier: "A", role: "rush",     skill: "Art of Blades — giảm độ bền giáp của địch khi bắn trúng." },
  { name: "Moco Enigma",      itemId: "101000023", awakenedOf: "Moco",   tier: "B", role: "info",     skill: "Hacker's Vision — đánh dấu địch và làm chậm tốc độ hồi phục của chúng." },
  { name: "Andrew the Fierce",itemId: "102000027", awakenedOf: "Andrew", tier: "C", role: "defense",  skill: "Machete Enthusiast — giảm hao mòn giáp mạnh hơn bản thường." },
];

// ── Helpers cho trang nhân vật (/characters) ──────────────────

export function characterImage(itemId?: string, image?: string): string | null {
  if (image) return image;
  return itemId ? iconUrl(itemId) : null;
}

export type CharacterListItem = {
  name: string;
  slug: string;
  tier: Tier;
  role: CharRole;
  skill: string;
  skillType: SkillType;
  image: string | null;
  awakenedOf: string | null;
};

function toListItem(c: FFCharacter): CharacterListItem {
  return {
    name: c.name,
    slug: charSlug(c.name),
    tier: c.tier,
    role: c.role,
    skill: c.skill,
    skillType: skillType(c.name),
    image: characterImage(c.itemId, c.image),
    awakenedOf: c.awakenedOf ?? null,
  };
}

export function getAllCharacters(): CharacterListItem[] {
  return FF_CHARACTERS.map(toListItem);
}

export function getCharacterBySlug(slug: string): CharacterListItem | null {
  const found = FF_CHARACTERS.find((c) => charSlug(c.name) === slug);
  return found ? toListItem(found) : null;
}

// Tách phần "tên kỹ năng" và "mô tả" từ chuỗi skill "Tên — mô tả".
export function splitSkill(skill: string): { name: string; desc: string } {
  const idx = skill.indexOf("—");
  if (idx === -1) return { name: skill.trim(), desc: "" };
  return { name: skill.slice(0, idx).trim(), desc: skill.slice(idx + 1).trim() };
}
