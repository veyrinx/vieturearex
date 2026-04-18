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
        </div>
      ) : null}
      <h2 className="font-heading text-3xl font-black uppercase md:text-4xl text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-muted-foreground md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
