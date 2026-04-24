"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AdminRoleLevel = "super_admin" | "admin" | "it" | "manager" | "support" | null;

const EDIT_ROLES: string[] = ["super_admin", "admin", "it"];
const ADMIN_ROLES: string[] = ["super_admin", "admin", "it", "manager", "support"];

export function useAdminRole() {
  const [role, setRole] = useState<AdminRoleLevel>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) { setLoading(false); return; }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle() as { data: { role: string } | null };
      if (!cancelled) {
        setRole((data?.role as AdminRoleLevel) ?? null);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return {
    role,
    loading,
    isAdmin: ADMIN_ROLES.includes(role ?? ""),
    canEdit: EDIT_ROLES.includes(role ?? ""),
  };
}
