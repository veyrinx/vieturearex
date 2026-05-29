"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";
import { Activity, ShieldCheck, Clock } from "lucide-react";
import { useActiveAdminsQuery } from "@/hooks/use-active-admins-query";
import { LoadingSpinner } from "@/components/common/loading-spinner";

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-teal-600",
];

function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ActiveAdminsPanel() {
  const { data: activeAdmins = [], isLoading } = useActiveAdminsQuery();

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary dark:text-amber-400">
            Theo dõi thời gian thực
          </p>
          <h2 className="font-heading text-lg font-black uppercase tracking-[0.06em] text-foreground">
            Quản trị viên đang hoạt động
          </h2>
        </div>
        <div className={[
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold uppercase tracking-[0.08em]",
          activeAdmins.length > 0
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-border bg-background/80 text-muted-foreground",
        ].join(" ")}>
          <span className={["size-2 rounded-full", activeAdmins.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"].join(" ")} />
          {activeAdmins.length} online
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-8" label="ĐANG TẢI..." />
      ) : activeAdmins.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Activity className="size-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Chưa có quản trị viên nào hoạt động trong 90 giây qua.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeAdmins.map((admin) => {
            const avatarColor = getAvatarColor(admin.email);
            const initial = admin.email[0].toUpperCase();
            const timeAgo = formatDistanceToNowStrict(new Date(admin.last_seen), { addSuffix: true, locale: vi });

            return (
              <article key={admin.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3 transition-colors hover:bg-muted/30">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md ${avatarColor}`}>
                  {initial}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">{admin.email}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    <span>Hoạt động {timeAgo}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="size-3" />
                  Live
                </span>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
