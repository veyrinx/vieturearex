"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActiveAdminItem } from "@/lib/types/content";

async function fetchActiveAdmins() {
  const response = await fetch("/api/admin/active-admins", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load active admins.");
  }

  const data = (await response.json()) as { activeAdmins: ActiveAdminItem[] };
  return data.activeAdmins;
}

export function useActiveAdminsQuery() {
  return useQuery({
    queryKey: ["active-admins"],
    queryFn: fetchActiveAdmins,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}
