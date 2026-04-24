"use client";

import { useEffect, useState } from "react";

export type AdminRoleLevel = "super_admin" | "admin" | "it" | "manager" | "support" | null;

type MeResponse = {
  role: string | null;
  isAdmin: boolean;
  canEdit: boolean;
};

export function useAdminRole() {
  const [state, setState] = useState<MeResponse & { loading: boolean }>({
    role: null,
    isAdmin: false,
    canEdit: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/user/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? (res.json() as Promise<MeResponse>) : null))
      .then((data) => {
        if (!cancelled) {
          setState({
            role: (data?.role ?? null) as AdminRoleLevel,
            isAdmin: data?.isAdmin ?? false,
            canEdit: data?.canEdit ?? false,
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
