"use client";

import { useQuery } from "@tanstack/react-query";
import type { EventItem, EventStatus } from "@/lib/types/content";

type Params = {
  search?: string;
  status?: EventStatus | "all";
};

async function fetchEvents(params: Params) {
  const query = new URLSearchParams();
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }

  const response = await fetch(`/api/events?${query.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load events.");
  }

  const data = (await response.json()) as { events: EventItem[] };
  return data.events;
}

export function useEventsQuery(params: Params) {
  return useQuery({
    queryKey: ["events", params.search ?? "", params.status ?? "all"],
    queryFn: () => fetchEvents(params),
    refetchInterval: 30_000,
    placeholderData: (previousData) => previousData,
  });
}
