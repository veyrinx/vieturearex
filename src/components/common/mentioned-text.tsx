"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { extractMentions, renderTextWithMentions } from "@/lib/utils/mentions";

type Props = {
  text: string;
  className?: string;
};

type MentionLookup = Record<string, string>; // username (lowercase) → user_id

/**
 * Render text with @mentions auto-linked to user profiles.
 * Looks up display names → user IDs via /api/user/lookup.
 */
export function MentionedText({ text, className }: Props) {
  const [lookup, setLookup] = useState<MentionLookup>({});

  useEffect(() => {
    const names = extractMentions(text);
    if (names.length === 0) return;
    fetch(`/api/user/lookup?names=${encodeURIComponent(names.join(","))}`)
      .then((r) => (r.ok ? r.json() : { users: {} }))
      .then((d: { users?: MentionLookup }) => setLookup(d.users ?? {}))
      .catch(() => null);
  }, [text]);

  const parts = renderTextWithMentions(text, (name, idx) => {
    const userId = lookup[name.toLowerCase()];
    if (userId) {
      return (
        <Link
          key={`m-${idx}`}
          href={`/u/${userId}`}
          className="font-semibold text-primary hover:underline dark:text-amber-400"
          onClick={(e) => e.stopPropagation()}
        >
          @{name}
        </Link>
      );
    }
    return (
      <span key={`m-${idx}`} className="font-semibold text-muted-foreground">
        @{name}
      </span>
    );
  });

  return <span className={className}>{parts}</span>;
}
