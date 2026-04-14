"use client";

import { useQuery } from "@tanstack/react-query";
import type { InvitedEmailItem } from "@/lib/types/content";

async function fetchInvitedEmails() {
  const response = await fetch("/api/admin/invited-emails", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load invited emails.");
  }

  const data = (await response.json()) as { invitedEmails: InvitedEmailItem[] };
  return data.invitedEmails;
}

export function useInvitedEmailsQuery() {
  return useQuery({
    queryKey: ["invited-emails"],
    queryFn: fetchInvitedEmails,
  });
}
