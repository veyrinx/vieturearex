"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventItem } from "@/lib/types/content";

export const ADMIN_EVENTS_KEY = ["admin-events"] as const;

async function fetchAdminEvents(): Promise<EventItem[]> {
  const res = await fetch("/api/admin/events", { cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load admin events.");
  const data = (await res.json()) as { events: EventItem[] };
  return data.events;
}

export function useAdminEventsQuery() {
  return useQuery({
    queryKey: ADMIN_EVENTS_KEY,
    queryFn: fetchAdminEvents,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateAdminEvents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_KEY });
}
