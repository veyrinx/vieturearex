import type { ReactNode } from "react";
import { CraftlandNav } from "@/components/craftland/craftland-nav";

export default function CraftlandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 py-6 md:py-8">
      <CraftlandNav />
      {children}
    </div>
  );
}
