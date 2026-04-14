import { LoadingSpinner } from "@/components/common/loading-spinner";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoadingSpinner label="Đang tải dữ liệu..." />
    </main>
  );
}
