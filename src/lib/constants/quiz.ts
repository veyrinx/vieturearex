// Câu hỏi Quiz Free Fire — quản lý trong /admin/quiz (lưu ở settings key site.quiz_questions).
// File thuần (dùng được cả client & server).

export type QuizQuestion = {
  q: string; // câu hỏi
  opts: string[]; // 2..6 đáp án
  ans: number; // index đáp án đúng (0-based)
};

export const SETTINGS_KEY_QUIZ = "site.quiz_questions";

// Bộ câu mặc định — dùng khi admin chưa cấu hình (quiz luôn có nội dung).
export const DEFAULT_QUIZ: QuizQuestion[] = [
  { q: "Chế độ nào trong Free Fire cho phép 50 người chơi trên một bản đồ nhỏ hơn?", opts: ["Clash Squad", "Battle Royale", "Lone Wolf", "CS Ranked"], ans: 0 },
  { q: "Nhân vật nào có kỹ năng 'Thần Kinh Thép' giúp giảm sát thương khi bị tấn công?", opts: ["Alok", "Chrono", "Kla", "Hayato"], ans: 3 },
  { q: "Vật phẩm nào giúp người chơi hồi phục máu theo thời gian?", opts: ["Mushroom", "Medkit", "Adhesive", "Bandage"], ans: 2 },
  { q: "Bao nhiêu điểm để leo từ Đồng lên Bạc trong Free Fire?", opts: ["500 điểm", "1000 điểm", "1500 điểm", "2000 điểm"], ans: 0 },
  { q: "Chế độ 'Bermuda' là tên của loại gì trong Free Fire?", opts: ["Nhân vật", "Bản đồ", "Vũ khí", "Xe cộ"], ans: 1 },
  { q: "Kỹ năng active của nhân vật DJ Alok là gì?", opts: ["Tàng hình 3 giây", "Tạo vùng hồi máu và tăng tốc", "Gây điếc đối thủ", "Khiên năng lượng"], ans: 1 },
  { q: "Súng SCAR trong Free Fire thuộc loại nào?", opts: ["Sniper", "Shotgun", "Assault Rifle", "SMG"], ans: 2 },
  { q: "Trong Clash Squad, mỗi round tối đa bao nhiêu giây?", opts: ["60 giây", "90 giây", "120 giây", "180 giây"], ans: 1 },
  { q: "Rank cao nhất trong Free Fire Ranked mode là gì?", opts: ["Heroic", "Grandmaster", "Master", "Supreme"], ans: 1 },
  { q: "Khi nào thì 'Safe Zone' bắt đầu thu hẹp trong Battle Royale?", opts: ["Ngay từ đầu", "Sau 1 phút", "Khi còn 40 người", "Theo timer hiển thị trên màn hình"], ans: 3 },
];

export function parseQuiz(raw: string | null | undefined): QuizQuestion[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: QuizQuestion[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.q === "string" ? o.q.trim() : "";
    const opts = Array.isArray(o.opts)
      ? o.opts.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 200))
      : [];
    const ans = typeof o.ans === "number" ? o.ans : 0;
    if (!q || opts.length < 2) continue;
    out.push({ q: q.slice(0, 300), opts: opts.slice(0, 6), ans: Math.min(Math.max(0, ans), opts.length - 1) });
    if (out.length >= 100) break;
  }
  return out;
}

export function serializeQuiz(list: QuizQuestion[]): string {
  return JSON.stringify(list.map((x) => ({ q: x.q, opts: x.opts, ans: x.ans })));
}
