import type React from "react";

// Match @ followed by 2-40 word chars (letters, digits, underscore) including Unicode
const MENTION_REGEX = /@([\p{L}0-9_]{2,40})/gu;

/**
 * Extract all @mentions (without @) from a text string.
 * Returns unique lowercase usernames.
 */
export function extractMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_REGEX);
  const set = new Set<string>();
  for (const m of matches) {
    if (m[1]) set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

/**
 * Render text with @mentions highlighted as React elements.
 * `renderMention` is called for each mention; return whatever ReactNode you want.
 */
export function renderTextWithMentions(
  text: string,
  renderMention: (name: string, idx: number) => React.ReactNode,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let idx = 0;
  for (const match of text.matchAll(MENTION_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(renderMention(match[1], idx++));
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
