import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  align = "left",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "space-y-2.5",
        centered && "flex flex-col items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <div className={cn("flex items-center gap-2.5", centered && "justify-center")}>
          {!centered && (
            <span className="h-px w-6 bg-gradient-to-r from-primary to-primary/60 dark:from-amber-400 dark:to-amber-400/60" />
          )}
          {Icon && (
            <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
              <Icon className="size-3" />
            </span>
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            {eyebrow}
          </span>
          <span
            className={cn(
              "h-px bg-gradient-to-r from-primary/30 to-transparent dark:from-amber-400/30",
              centered ? "w-6 order-first bg-gradient-to-l" : "flex-1",
            )}
          />
        </div>
      ) : null}
      <h2 className="relative font-heading text-3xl font-black uppercase leading-[0.95] tracking-[0.02em] md:text-4xl">
        <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </span>
        {/* subtle glow accent under the title */}
        <span
          aria-hidden
          className={cn(
            "mt-2 block h-1 w-14 rounded-full bg-gradient-to-r from-primary to-primary/0 dark:from-amber-400 dark:to-amber-400/0",
            centered && "mx-auto bg-gradient-to-r from-primary/0 via-primary to-primary/0 dark:via-amber-400",
          )}
          style={{ boxShadow: "0 0 16px hsl(var(--primary)/0.4)" }}
        />
      </h2>
      {description ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
