import { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
};

export function StatsCard({ title, value, icon: Icon }: StatsCardProps) {
  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</span>
        <div className="rounded-lg border border-border bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 font-heading text-3xl font-bold text-foreground">{value}</p>
    </article>
  );
}
