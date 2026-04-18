"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserItem } from "@/lib/types/content";

async function fetchUsers() {
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load users.");
  }
  const data = (await response.json()) as { users: UserItem[] };
  return data.users;
}

export function useUsersQuery() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 0,
    refetchOnMount: true,
  });
}
