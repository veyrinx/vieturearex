import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        // Traveling light sweep (GPU-only transform). Falls back to a gentle
        // pulse when the user prefers reduced motion.
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent before:content-[''] before:animate-[shimmer_1.6s_infinite]",
        "motion-reduce:animate-pulse motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
