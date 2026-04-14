import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-primary shadow-[0_8px_22px_rgba(0,82,255,0.08)] dark:border-primary/35 dark:bg-primary/10 dark:shadow-[0_0_24px_-10px_rgba(247,147,26,0.3)]">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="font-heading text-3xl font-bold uppercase tracking-[0.06em] text-foreground md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
