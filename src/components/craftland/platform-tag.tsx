import { Monitor, Smartphone } from "lucide-react";

export function PlatformTag({ platform }: { platform: "pc" | "mobile" | "both" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      {platform !== "mobile" && <Monitor className="size-3" aria-hidden />}
      {platform !== "pc" && <Smartphone className="size-3" aria-hidden />}
      {platform === "both" ? "PC & Mobile" : platform === "pc" ? "PC" : "Mobile"}
    </span>
  );
}
