"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; cls: string }> = {
  info:    { icon: Info,          cls: "border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  warning: { icon: AlertTriangle, cls: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  success: { icon: CheckCircle2,  cls: "border-green-400/30 bg-green-500/10 text-green-700 dark:text-green-300" },
  error:   { icon: AlertCircle,   cls: "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300" },
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    void fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setItems(d.announcements ?? []))
      .catch(() => null);
  }, []);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {visible.map((a) => {
        const config = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
        const Icon = config.icon;
        return (
          <div key={a.id} className={cn("flex items-center gap-3 border-b px-4 py-2.5 text-sm", config.cls)}>
            <Icon className="size-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}</span>
              {a.message && <span className="ml-1.5 opacity-80">{a.message}</span>}
            </div>
            <button
              onClick={() => setDismissed((p) => new Set([...p, a.id]))}
              className="shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
