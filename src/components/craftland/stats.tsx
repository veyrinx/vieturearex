/**
 * Thành phần số liệu tĩnh — KHÔNG "use client": trang server truyền hàm
 * `labelFor` vào BreakdownBars, mà hàm thì không gửi được sang Client Component.
 * Biểu đồ cần tương tác (tooltip) nằm ở charts.tsx.
 */

const nf = new Intl.NumberFormat("vi-VN");

/** Thanh ngang một màu cho phân rã (nguồn, thiết bị...). Số in thẳng cạnh thanh. */
export function BreakdownBars({
  rows,
  labelFor,
  emptyText = "Chưa có dữ liệu.",
}: {
  rows: Array<{ key: string; total: number }>;
  labelFor?: (key: string) => string;
  emptyText?: string;
}) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.total));
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="group" title={`${labelFor?.(r.key) ?? r.key}: ${nf.format(r.total)} (${Math.round((r.total / sum) * 100)}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-foreground">{labelFor?.(r.key) ?? r.key}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{nf.format(r.total)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatTile({ label, value, hint, sub }: { label: string; value: string; hint?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {hint && (
          <span className="cursor-help rounded-full border border-border px-1 text-[10px] leading-4" title={hint} aria-label={hint}>?</span>
        )}
      </div>
      <div className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
