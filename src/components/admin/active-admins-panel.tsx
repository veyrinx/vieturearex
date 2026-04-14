"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";
import { Activity, ShieldCheck } from "lucide-react";
import { useActiveAdminsQuery } from "@/hooks/use-active-admins-query";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function ActiveAdminsPanel() {
  const { data: activeAdmins = [], isLoading } = useActiveAdminsQuery();

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Quản trị viên hoạt động</p>
          <h2 className="mt-1 font-heading text-xl font-semibold uppercase tracking-[0.06em] text-foreground">
            Theo dõi trạng thái thời gian thực
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm font-medium uppercase tracking-[0.08em] text-foreground">
          <Activity className="size-4 text-emerald-500" />
          {activeAdmins.length} đang hoạt động
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-8" label="ĐANG TẢI QUẢN TRỊ VIÊN HOẠT ĐỘNG..." />
      ) : activeAdmins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          Chưa có quản trị viên nào được ghi nhận hoạt động trong 90 giây gần nhất.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeAdmins.map((admin) => (
            <article key={admin.id} className="rounded-2xl border border-border bg-background/80 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{admin.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Cập nhật {formatDistanceToNowStrict(new Date(admin.last_seen), { addSuffix: true, locale: vi })}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  Đang hoạt động
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
