/**
 * Skeleton hiển thị khi điều hướng giữa các trang trong (site).
 * Navbar/footer từ layout vẫn giữ nguyên; phần này lấp vùng nội dung.
 */
export default function SiteLoading() {
  return (
    <div className="space-y-10 py-6" aria-busy="true" aria-label="Đang tải nội dung">
      {/* Khối lớn đầu trang (hero/banner) */}
      <div className="h-56 animate-pulse rounded-3xl bg-muted md:h-72" />

      {/* Tiêu đề section */}
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Lưới thẻ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
