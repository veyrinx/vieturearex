import type { LucideIcon } from "lucide-react";

/** Hero gradient premium dùng chung cho các trang công cụ/nội dung. */
export function PageHero({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/5" />
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl dark:bg-amber-400/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm dark:bg-amber-400/10 dark:text-amber-400">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">{eyebrow}</p>
          <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
