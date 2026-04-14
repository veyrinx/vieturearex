"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
};

export function TiltCard({ children, className }: TiltCardProps) {
  return (
    <div
      className={cn(
        "transition-shadow duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
