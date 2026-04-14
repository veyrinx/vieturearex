import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "h-10 w-full min-w-0 rounded-xl border border-input bg-card/88 px-3 py-2 text-base leading-none text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-card/72 dark:shadow-[0_16px_34px_rgba(0,0,0,0.2)] dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:leading-none",
          className
        )}
        ref={ref}
        autoComplete={
          type === "password" ? "current-password" :
            type === "email" ? "email" :
              undefined
        }
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
