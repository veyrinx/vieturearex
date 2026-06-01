"use client";

import { useMemo } from "react";

type Props = { content: string; className?: string };

// Sanitize + render forum HTML content client-side.
// Falls back to plain text whitespace-pre-wrap for legacy plain-text posts.
export function ForumContent({ content, className }: Props) {
  const isHtml = content.trimStart().startsWith("<");

  const sanitized = useMemo(() => {
    if (!isHtml) return null;
    // Dynamic import to keep bundle size small
    if (typeof window === "undefined") return content;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sanitizeHtml = require("sanitize-html") as typeof import("sanitize-html");
      return sanitizeHtml(content, {
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
          pre: ["class"],
        },
        allowedSchemes: ["https", "http"],
        transformTags: {
          a: (tagName, attribs) => ({
            tagName,
            attribs: {
              ...attribs,
              target: "_blank",
              rel: "noopener noreferrer nofollow",
            },
          }),
        },
      });
    } catch {
      return content;
    }
  }, [content, isHtml]);

  if (!isHtml) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed text-foreground/90 ${className ?? ""}`}>
        {content}
      </div>
    );
  }

  return (
    <article
      className={`prose prose-sm dark:prose-invert max-w-none leading-relaxed
        prose-headings:font-heading prose-headings:text-foreground
        prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground
        prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
        prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground/90
        ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: sanitized ?? "" }}
    />
  );
}
