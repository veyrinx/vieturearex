/**
 * Helpers for validating forum post/reply bodies.
 *
 * The forum editor (TipTap) emits HTML, so raw `content.length` counts markup,
 * not what the user actually typed — a short formatted reply can blow past a
 * character cap while looking tiny on screen. Everything user-facing must
 * measure the *visible* text instead.
 */

/** Max HTML payload accepted for a reply (matches the DB CHECK constraint). */
export const REPLY_MAX_HTML = 20_000;
/** Minimum visible characters for a reply that has no image. */
export const REPLY_MIN_TEXT = 2;

/** Visible text of an HTML fragment, with whitespace collapsed. */
export function plainTextOf(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasImage(html: string): boolean {
  return /<img\b/i.test(html);
}

/**
 * Validate a reply body. Returns a Vietnamese error message, or null when ok.
 * An image-only reply is allowed.
 */
export function validateReplyContent(html: string): string | null {
  if (html.length > REPLY_MAX_HTML) return "Nội dung quá dài, vui lòng rút gọn.";
  const text = plainTextOf(html);
  if (text.length === 0 && !hasImage(html)) return "Vui lòng nhập nội dung trả lời.";
  if (text.length > 0 && text.length < REPLY_MIN_TEXT && !hasImage(html)) {
    return `Nội dung cần ít nhất ${REPLY_MIN_TEXT} ký tự.`;
  }
  return null;
}
