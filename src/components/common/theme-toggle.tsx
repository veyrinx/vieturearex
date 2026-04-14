"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("theme-control-surface rounded-xl opacity-0", className)}
        aria-label="ĐỔI GIAO DIỆN"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "theme-control-surface rounded-xl transition hover:brightness-105",
        className,
      )}
      aria-label="ĐỔI GIAO DIỆN"
    >
      {isDark ? (
        <Sun className="size-4 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.38)]" />
      ) : (
        <Moon className="size-4 text-[#0052FF] drop-shadow-[0_0_10px_rgba(0,82,255,0.22)]" />
      )}
    </Button>
  );
}
