"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteSetting } from "@/lib/types/content";

async function fetchSettings() {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) {
    throw new Error("Unable to load settings.");
  }
  const data = (await response.json()) as { settings: SiteSetting[] };
  return data.settings;
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
}
