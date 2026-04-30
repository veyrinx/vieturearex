"use client";

import { useEffect, useState } from "react";
import { EVENT_SERVERS, type EventServer } from "@/lib/constants/event-servers";

let cached: EventServer[] | null = null;
let inflight: Promise<EventServer[]> | null = null;

async function load(): Promise<EventServer[]> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch("/api/public/event-servers", { cache: "no-store" })
    .then((r) => r.ok ? r.json() : null)
    .then((data: { servers?: EventServer[] } | null) => {
      const list = data?.servers && Array.isArray(data.servers) && data.servers.length > 0
        ? data.servers
        : EVENT_SERVERS;
      cached = list;
      return list;
    })
    .catch(() => EVENT_SERVERS)
    .finally(() => { inflight = null; });
  return inflight;
}

/** Returns the merged (preset + custom − hidden) server list for client components. */
export function useEventServers(): EventServer[] {
  const [servers, setServers] = useState<EventServer[]>(cached ?? EVENT_SERVERS);
  useEffect(() => {
    let alive = true;
    load().then((list) => { if (alive) setServers(list); });
    return () => { alive = false; };
  }, []);
  return servers;
}

/** Look up a single server by key against the merged list. */
export function useEventServer(key: string | null | undefined) {
  const list = useEventServers();
  if (!key) return null;
  return list.find((s) => s.key === key.toLowerCase()) ?? null;
}
