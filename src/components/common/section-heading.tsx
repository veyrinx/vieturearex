import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <div className="flex items-center gap-2.5">
          <span className="h-px w-6 bg-primary dark:bg-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary dark:text-amber-400">
            {eyebrow}
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent dark:from-amber-400/30" />
        </div>
      ) : null}
      <h2 className="font-heading text-3xl font-black uppercase tracking-[0.03em] md:text-4xl">
        <span className="text-foreground">{title}</span>
      </h2>
      {description ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-sm">
          {description}
        </p>
      ) : null}
    </div>
  );
}
