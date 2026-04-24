import "server-only";

// Vietnamese profanity and illegal/harmful content patterns.
// Covers common vulgarities, hate speech triggers, and legally sensitive terms.
const BLOCKED_PATTERNS: RegExp[] = [
  // Vulgar insults (Vietnamese)
  /\b(đ[ụuư]t|đ[ụuư]c|đ[ụuư])\b/i,
  /\b(c[ặấáắa]c|cu\b|cặc)\b/i,
  /\b(l[ồổốọ]n|l[ồổốọ]i)\b/i,
  /\b(đ[ầếéàa]n\s*b[àáạẹ]|đ[ầếéàa]n\s*ông)\b/i,
  /\bchó\s*chết\b/i,
  /\bthằng\s*(chó|ngu|điên|khùng|óc\s*chó)\b/i,
  /\bcon\s*(đĩ|điếm|chó)\b/i,
  /\b(mẹ|má|mầy|tao)\s*(kiếp|bán)\b/i,
  /\b(vãi|v[ãà]i)\s*(lồn|đái|nồi|chưởi)\b/i,
  /\bvcl\b/i,
  /\bđmm?\b/i,
  /\bclm\b/i,
  /\bcsm\b/i,
  /\bkml\b/i,

  // Hate/discrimination
  /\b(giết|thảm\s*sát|tàn\s*sát)\s*(người|dân|cộng\s*đồng)\b/i,

  // Illegal content (Vietnam-specific)
  /\b(cờ\s*bạc|cá\s*độ|casino)\s*(online|trực\s*tuyến)\b/i,
  /\b(ma\s*túy|heroin|cocaine|cần\s*sa|thuốc\s*lắc)\b/i,
  /\b(mua\s*bán\s*người|buôn\s*người)\b/i,
  /\b(bán\s*vũ\s*khí|súng\s*đạn)\b/i,
];

const HOLD_FOR_REVIEW_PATTERNS: RegExp[] = [
  // Mild insults / borderline
  /\b(ngu|óc\s*chó|ngu\s*như\s*bò|ngu\s*ngốc)\b/i,
  /\b(chết\s*đi|đồ\s*ngu|đồ\s*ngốc|đồ\s*khùng)\b/i,
  /\b(spam|quảng\s*cáo|hack|cheat)\b/i,
  // Phone numbers (potential spam/solicitation)
  /\b0[0-9]{9}\b/,
  // Links in comments (potential spam)
  /https?:\/\//i,
];

export type ContentVerdict = "approved" | "rejected" | "pending";

export function checkContent(text: string): ContentVerdict {
  const normalized = text.trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) return "rejected";
  }

  for (const pattern of HOLD_FOR_REVIEW_PATTERNS) {
    if (pattern.test(normalized)) return "pending";
  }

  return "approved";
}
