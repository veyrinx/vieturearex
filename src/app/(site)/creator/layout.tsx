import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { StudioNav } from "@/components/craftland/studio-nav";
import { VerifiedBadge } from "@/components/craftland/verified-badge";
import { getAuthContext } from "@/lib/server/auth";
import { getCreatorByUserId } from "@/lib/server/craftland";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creator Studio — Craftland",
  robots: { index: false, follow: false },
};

export default async function CreatorStudioLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (!auth.userId) redirect("/auth/login?next=/creator");
  const creator = await getCreatorByUserId(auth.userId).catch(() => null);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 py-6 md:py-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Creator Studio</p>
          {creator && (
            <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold">
              {creator.display_name}
              {creator.verification_status === "verified" && <VerifiedBadge />}
            </p>
          )}
        </div>
        <StudioNav hasProfile={!!creator} />
      </aside>
      <main className="min-w-0">
        {creator?.status === "suspended" && (
          <div role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
            Hồ sơ creator đang bị khoá{creator.suspended_reason ? `: ${creator.suspended_reason}` : "."} Liên hệ đội ngũ hỗ trợ nếu bạn muốn khiếu nại.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
