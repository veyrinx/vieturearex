"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export function AdminOnlineBadge() {
  const [admins, setAdmins] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAdmins() {
      try {
        const res = await fetch("/api/public/active-admins");
        if (!res.ok || cancelled) return;
        const data = await res.json() as { admins?: string[] };
        if (!cancelled) setAdmins(data.admins ?? []);
      } catch { /* ignore */ }
    }

    void fetchAdmins();
    const interval = setInterval(() => void fetchAdmins(), 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (admins.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/8 px-3 py-1.5">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
      </span>
      <Shield className="size-3 text-green-500" />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-green-600 dark:text-green-400">
        {admins.length === 1 ? admins[0] : `${admins[0]} +${admins.length - 1}`} đang trực
      </span>
    </div>
  );
}
