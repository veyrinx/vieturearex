import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Lock, Clock3, Home, ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { findFeatureLock, LOCK_LABELS, type FeatureLockStatus } from "@/lib/constants/feature-locks";
import { getFeatureLocks } from "@/lib/server/feature-locks";

export const metadata: Metadata = {
  title: "Đang cập nhật | Arex",
  robots: { index: false, follow: false },
};

const ICON: Record<FeatureLockStatus, typeof Wrench> = {
  maintenance: Wrench,
  locked: Lock,
  "coming-soon": Clock3,
};

export default async function FeatureLockedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const lock = from ? findFeatureLock(from, await getFeatureLocks()) : null;
  const status: FeatureLockStatus = lock?.status ?? "maintenance";
  const title = lock?.title ?? LOCK_LABELS[status];
  const message =
    lock?.message ?? "Chức năng này đang được nâng cấp. Các phần khác của web vẫn hoạt động bình thường.";
  const Icon = ICON[status];

  return (
    <main className="container-main my-16 max-w-lg space-y-8 text-center">
      <PageHero icon={Icon} eyebrow={LOCK_LABELS[status]} title={title} subtitle={message} />

      {lock?.until && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground">
          <Clock3 className="size-4" /> Dự kiến mở lại: <b className="text-foreground">{lock.until}</b>
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Home className="size-4" /> Về trang chủ
        </Link>
        <Link
          href="/cong-cu"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Xem công cụ khác
        </Link>
      </div>
    </main>
  );
}
