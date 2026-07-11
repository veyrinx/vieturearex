import type { Metadata } from "next";
import { History, Rocket } from "lucide-react";
import { CHANGELOG, CHANGE_META } from "@/lib/data/changelog";

export const metadata: Metadata = { title: "Lịch sử phiên bản" };

const BUILD = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export default function ChangelogPage() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/8 to-card p-6 dark:from-amber-500/8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
            <History className="size-5 text-primary dark:text-amber-400" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Lịch sử phiên bản</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              Hiện tại: v{CHANGELOG[0]?.version} · build {BUILD}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-5">
        {CHANGELOG.map((entry, idx) => (
          <div key={entry.version} className="relative rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              {idx === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary dark:bg-amber-400/10 dark:text-amber-400">
                  <Rocket className="size-3" /> Mới nhất
                </span>
              )}
              <h2 className="font-heading text-lg font-black text-foreground">v{entry.version}</h2>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
            </div>
            <ul className="space-y-2">
              {entry.changes.map((c, i) => {
                const meta = CHANGE_META[c.type];
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm text-foreground/90">{c.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
