"use client";

import { useEffect } from "react";

export function AdminHeartbeat() {
  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      if (!mounted) {
        return;
      }

      await fetch("/api/admin/active-admins", {
        method: "POST",
      }).catch(() => null);
    };

    void ping();
    const interval = window.setInterval(() => {
      void ping();
    }, 15_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
