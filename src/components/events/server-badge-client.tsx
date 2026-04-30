"use client";

import { useEventServer } from "@/hooks/use-event-servers";
import { ServerBadge } from "@/components/events/server-badge";

type Props = {
  serverKey?: string | null;
  className?: string;
  variant?: "compact" | "full";
};

/**
 * Client wrapper that resolves the server through useEventServers() so the
 * badge picks up admin-defined logos / custom entries automatically. Falls
 * back to the static preset constant when the merged list isn't ready yet.
 */
export function ServerBadgeClient({ serverKey, className, variant }: Props) {
  const meta = useEventServer(serverKey);
  return (
    <ServerBadge
      serverKey={serverKey}
      server={meta}
      className={className}
      variant={variant}
    />
  );
}
