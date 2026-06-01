"use client";

import { useMemo } from "react";
import sanitizeHtml from "sanitize-html";

type Props = { content: string; className?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SANITIZE_OPTIONS: any = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "del",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    code: ["class"],
    pre:  ["class"],
  },
  allowedSchemes: ["https", "http"],
  transformTags: {
    a: (_tag: string, attribs: Record<string, string>) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
  },
};

export function ForumContent({ content, className }: Props) {
  const isHtml = content.trimStart().startsWith("<");

  const sanitized = useMemo(
    () => (isHtml ? sanitizeHtml(content, SANITIZE_OPTIONS) : null),
    [content, isHtml],
  );

  if (!isHtml) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed text-foreground/90 ${className ?? ""}`}>
        {content}
      </div>
    );
  }

  return (
    <article
      className={[
        "prose prose-sm dark:prose-invert max-w-none leading-relaxed",
        "prose-headings:font-heading prose-headings:text-foreground",
        "prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground",
        "prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground/90",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: sanitized ?? "" }}
    />
  );
}
