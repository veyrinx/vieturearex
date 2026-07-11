// Tier list nhân vật Free Fire — dữ liệu do cộng đồng đánh giá (chế độ Sinh Tồn).
// Chỉ mang tính tham khảo, meta thay đổi theo mùa.

export type CharRole = "rush" | "support" | "heal" | "mobility" | "defense" | "info";
export type Tier = "S" | "A" | "B" | "C" | "D";

export type FFCharacter = {
  name: string;
  tier: Tier;
  role: CharRole;
  skill: string; // tên + mô tả ngắn kỹ năng
  image?: string; // URL ảnh chân dung (tùy chọn; thiếu thì hiện avatar chữ cái)
};

// Slug tên file ảnh: chữ thường, bỏ ký tự đặc biệt (vd "D-bee" -> "dbee")
export function charSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type SkillType = "active" | "passive";

// Nhân vật có kỹ năng CHỦ ĐỘNG (có hồi chiêu). Còn lại là bị động.
export const ACTIVE_SKILL_NAMES = new Set<string>([
  "Alok", "K", "Dimitri", "Skyler", "Chrono", "Wukong", "Xayne", "A124", "Steffie", "Rafael",
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
  { name: "Alok",    tier: "S", role: "heal",     skill: "Drop the Beat — tạo vùng hồi máu + tăng tốc chạy." },
  { name: "K",       tier: "S", role: "support",  skill: "Master of All — hồi EP nhanh, chuyển EP thành HP." },
  { name: "Dimitri", tier: "S", role: "heal",     skill: "Healing Heartbeat — vùng hồi máu, tự đứng dậy khi gục." },
  { name: "Skyler",  tier: "S", role: "rush",     skill: "Riptide Rhythm — phá gloo wall, hồi máu theo tường đã đặt." },
  { name: "Xayne",   tier: "S", role: "rush",     skill: "Xtreme Encounter — cộng HP tạm thời, tăng sát thương gloo/khiên." },
  { name: "Wukong",  tier: "S", role: "mobility", skill: "Camouflage — biến thành bụi cây khi đứng yên." },

  // ── A ──
  { name: "Chrono",   tier: "A", role: "defense",  skill: "Time Turner — khiên chắn đạn tạm thời." },
  { name: "Jota",     tier: "A", role: "rush",     skill: "Sustained Raids — hồi máu khi hạ gục địch bằng súng." },
  { name: "Hayato",   tier: "A", role: "rush",     skill: "Bushido — càng ít giáp càng xuyên giáp mạnh." },
  { name: "D-bee",    tier: "A", role: "rush",     skill: "Bullet Beats — tăng tốc & độ chính xác khi vừa chạy vừa bắn." },
  { name: "Steffie",  tier: "A", role: "support",  skill: "Painting Fearless — graffiti giảm sát thương đạn & nổ." },
  { name: "Shirou",   tier: "A", role: "info",     skill: "Damage Delivered — đánh dấu kẻ bắn mình, tăng xuyên giáp." },
  { name: "Joseph",   tier: "A", role: "mobility", skill: "Nutty Movement — tăng tốc chạy khi bị trúng đạn." },
  { name: "Kapella",  tier: "A", role: "heal",     skill: "Healing Song — tăng hiệu quả hồi máu, giảm mất máu khi gục." },
  { name: "A124",     tier: "A", role: "support",  skill: "Thrill of Battle — chuyển EP thành HP nhanh." },
  { name: "Wolfrahh", tier: "A", role: "defense",  skill: "Limelight — giảm sát thương chí mạng nhận vào." },

  // ── B ──
  { name: "Kelly",   tier: "B", role: "mobility", skill: "Dash — tăng tốc độ chạy." },
  { name: "Moco",    tier: "B", role: "info",     skill: "Hacker's Eye — đánh dấu địch bị bắn trúng." },
  { name: "Laura",   tier: "B", role: "rush",     skill: "Sharp Shooter — tăng chính xác khi ngắm bắn." },
  { name: "Miguel",  tier: "B", role: "support",  skill: "Crazy Slayer — nhận EP mỗi lần hạ gục." },
  { name: "Luqueta", tier: "B", role: "rush",     skill: "Hat Trick — tăng HP tối đa mỗi lần hạ gục." },
  { name: "Rafael",  tier: "B", role: "info",     skill: "Dead Silent — bắn tỉa/SMG giảm tiếng, địch mất máu nhanh hơn." },
  { name: "Shani",   tier: "B", role: "defense",  skill: "Gear Recycle — hồi giáp khi hạ gục địch." },
  { name: "Dasha",   tier: "B", role: "mobility", skill: "Partying On — giảm giật, giảm sát thương ngã." },
  { name: "Thiva",   tier: "B", role: "support",  skill: "Vital Vibes — cứu đồng đội nhanh hơn, tự hồi khi không bị bắn." },

  // ── C ──
  { name: "Kla",     tier: "C", role: "rush",     skill: "Muay Thai — tăng sát thương đấm tay không." },
  { name: "Nikita",  tier: "C", role: "rush",     skill: "Firearms Expert — nạp đạn SMG nhanh hơn." },
  { name: "Caroline",tier: "C", role: "mobility", skill: "Agility — tăng tốc chạy khi cầm shotgun." },
  { name: "Paloma",  tier: "C", role: "support",  skill: "Arms-dealing — mang đạn AR không tính vào túi đồ." },
  { name: "Andrew",  tier: "C", role: "defense",  skill: "Armor Specialist — giảm độ hao mòn của áo giáp." },
  { name: "Olivia",  tier: "C", role: "heal",     skill: "Healing Touch — hồi thêm HP khi cứu đồng đội." },
  { name: "Ford",    tier: "C", role: "defense",  skill: "Iron Will — giảm sát thương khi ở ngoài vùng an toàn." },
  { name: "Maxim",   tier: "C", role: "support",  skill: "Gluttony — ăn nấm/dùng vật phẩm nhanh hơn." },

  // ── D ──
  { name: "Otho",   tier: "D", role: "info",     skill: "Memory Mist — lộ vị trí địch tiếp theo khi hạ gục." },
  { name: "Notora", tier: "D", role: "support",  skill: "Racer's Blessing — hồi máu cả đội khi ngồi trên xe." },
  { name: "Misha",  tier: "D", role: "mobility", skill: "Afterburner — tăng tốc độ lái xe, giảm sát thương khi trên xe." },
  { name: "Antonio",tier: "D", role: "defense",  skill: "Gangster's Spirit — tăng HP khởi đầu mỗi trận." },
];
