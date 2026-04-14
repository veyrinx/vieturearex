"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[linear-gradient(135deg,#0052FF,#4D7CFF)] text-primary-foreground shadow-[0_8px_24px_rgba(0,82,255,0.22)] hover:-translate-y-0.5 hover:brightness-110 dark:bg-[linear-gradient(135deg,#EA580C,#F7931A)] dark:shadow-[0_0_24px_-6px_rgba(234,88,12,0.55)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-card/86 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-secondary/80 hover:text-foreground dark:bg-card/72 dark:shadow-[0_18px_36px_rgba(0,0,0,0.22)]",
        secondary:
          "bg-secondary/92 text-secondary-foreground shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:bg-secondary dark:bg-secondary/90 dark:shadow-[0_16px_32px_rgba(0,0,0,0.18)]",
        ghost: "hover:bg-accent/12 hover:text-foreground dark:hover:bg-accent/10 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
