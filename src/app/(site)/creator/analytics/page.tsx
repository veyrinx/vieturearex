import Link from "next/link";
import { Download } from "lucide-react";
import { DailyAreaChart } from "@/components/craftland/charts";
import { BreakdownBars, StatTile } from "@/components/craftland/stats";
import { RangePicker } from "@/components/craftland/studio-forms";
import { requireStudioUser } from "@/lib/server/craftland";
import { getCreatorAnalytics, parseRange } from "@/lib/server/craftland-stats";
import { METRIC_EXPLAINERS, SOURCE_LABELS } from "@/lib/constants/craftland";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("vi-VN");
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const DEVICE_LABELS: Record<string, string> = { mobile: "Điện thoại", tablet: "Máy tính bảng", desktop: "Máy tính" };
const regionName = (() => {
  try {
    const dn = new Intl.DisplayNames(["vi"], { type: "region" });
    return (code: string) => dn.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
})();

type SP = { range?: string; from?: string; to?: string; map?: string };

export default async function StudioAnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { userId } = await requireStudioUser({ needProfile: true });
  const sp = await searchParams;
  const range = parseRange(sp);
  const a = await getCreatorAnalytics(userId, range, sp.map ?? null);

  const exportQs = new URLSearchParams(
    Object.entries({ range: sp.range, from: sp.from, to: sp.to }).filter((e): e is [string, string] => !!e[1]),
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Phân tích chuyên sâu</h1>
          <p className="text-sm text-muted-foreground">{range.label} · chỉ dữ liệu ArexNetwork thật sự ghi nhận được.</p>
        </div>
        <a href={`/api/craftland/studio/export${exportQs ? `?${exportQs}` : ""}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary/40">
          <Download className="size-4" aria-hidden /> Xuất CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RangePicker basePath="/creator/analytics" current={sp} extra={{ map: sp.map }} />
        {a.maps.length > 1 && (
          <form className="flex items-center gap-2">
            {sp.range && <input type="hidden" name="range" value={sp.range} />}
            {sp.from && <input type="hidden" name="from" value={sp.from} />}
            {sp.to && <input type="hidden" name="to" value={sp.to} />}
            <select name="map" defaultValue={a.selectedMapId ?? ""} aria-label="Lọc theo bản đồ" className="h-9 rounded-lg border border-input bg-card px-2 text-sm">
              <option value="">Tất cả bản đồ</option>
              {a.maps.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-lg border border-border px-3 text-sm">Lọc</button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Lượt xem" value={nf.format(a.totals.views)} hint={METRIC_EXPLAINERS.views} />
        <StatTile label="Khách ước tính" value={nf.format(a.totals.unique)} hint={METRIC_EXPLAINERS.unique} />
        <StatTile label="Sao chép mã" value={nf.format(a.totals.copies)} hint={METRIC_EXPLAINERS.copies} />
        <StatTile label="Chia sẻ" value={nf.format(a.totals.shares)} hint={METRIC_EXPLAINERS.shares} />
        <StatTile label="Chuyển đổi" value={pct(a.conversion)} hint={METRIC_EXPLAINERS.conversion} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Lượt xem theo ngày</h2>
          <DailyAreaChart data={a.series} dataKey="views" label="Lượt xem" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Sao chép mã theo ngày</h2>
          <DailyAreaChart data={a.series} dataKey="copies" label="Sao chép mã" />
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Nguồn truy cập</h2>
          <BreakdownBars rows={a.breakdown.source} labelFor={(k) => SOURCE_LABELS[k] ?? k} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Trang giới thiệu bên ngoài</h2>
          <BreakdownBars rows={a.breakdown.referrer} emptyText="Chưa có lượt nào đến từ trang ngoài." />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Từ khoá tìm kiếm dẫn tới bản đồ</h2>
          <BreakdownBars rows={a.breakdown.search} emptyText="Chưa ghi nhận từ khoá nào." />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Thiết bị</h2>
          <BreakdownBars rows={a.breakdown.device} labelFor={(k) => DEVICE_LABELS[k] ?? k} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Trình duyệt</h2>
          <BreakdownBars rows={a.breakdown.browser} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Khu vực (tổng hợp)</h2>
          <BreakdownBars rows={a.breakdown.country} labelFor={regionName} emptyText="Hạ tầng hiện tại chưa cung cấp dữ liệu khu vực." />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="p-5 pb-3 text-sm font-semibold">So sánh hiệu suất giữa các bản đồ</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Bản đồ</th>
                <th className="px-3 py-2 text-right font-medium">Xem</th>
                <th className="px-3 py-2 text-right font-medium">Sao chép</th>
                <th className="px-3 py-2 text-right font-medium">Hướng dẫn</th>
                <th className="px-3 py-2 text-right font-medium">Chia sẻ</th>
                <th className="px-3 py-2 text-right font-medium">Chuyển đổi</th>
                <th className="px-3 py-2 text-right font-medium">Lưu</th>
                <th className="px-5 py-2 text-right font-medium">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {a.ranking.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5"><Link href={`/creator/analytics?map=${m.id}${sp.range ? `&range=${sp.range}` : ""}`} className="font-medium hover:text-primary">{m.title}</Link></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeViews)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeCopies)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeGuide)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeShares)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{pct(m.conversion)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.favorites)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.rating === null ? "—" : `${m.rating.toFixed(1)} (${m.ratingCount})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">Cách tính các chỉ số</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{METRIC_EXPLAINERS.views}</li>
          <li>{METRIC_EXPLAINERS.unique}</li>
          <li>{METRIC_EXPLAINERS.conversion}</li>
          <li>Thời gian tương tác và tỷ lệ thoát chưa được đo, nên không hiển thị.</li>
          <li>Không có thông tin cá nhân nào của khách truy cập được hiển thị hay lưu trữ.</li>
        </ul>
      </section>
    </div>
  );
}
