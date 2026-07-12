import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { getPendingCounts } from "@/lib/data/admin-pending";

export async function NeedsAttentionPanel() {
  const items = await getPendingCounts();
  const active = items.filter((i) => i.count > 0);
  const total = active.reduce((a, i) => a + i.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10">
          <AlertCircle className="size-4 text-amber-500" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Cần xử lý</h2>
          <p className="text-[11px] text-muted-foreground">Mục đang chờ duyệt / xét</p>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-500 tabular-nums">
            {total.toLocaleString("vi-VN")}
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" /> Tất cả đã xử lý — không có mục nào đang chờ.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {active.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-amber-500/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 font-heading text-sm font-black text-amber-500 tabular-nums">
                {it.count > 99 ? "99+" : it.count}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{it.label}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
