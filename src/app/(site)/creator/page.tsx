import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { DailyAreaChart } from "@/components/craftland/charts";
import { StatTile } from "@/components/craftland/stats";
import { RangePicker } from "@/components/craftland/studio-forms";
import { requireStudioUser } from "@/lib/server/craftland";
import { getCreatorAnalytics, parseRange } from "@/lib/server/craftland-stats";
import { MAP_STATUS_META, METRIC_EXPLAINERS, craftlandMapHref } from "@/lib/constants/craftland";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("vi-VN");
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export default async function StudioDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const { userId, creator } = await requireStudioUser();
  const sp = await searchParams;

  if (!creator) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h1 className="font-heading text-2xl font-bold">Chào mừng đến Creator Studio</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Tạo hồ sơ creator để đăng bản đồ Craftland, nhận phản hồi kiểm duyệt và theo dõi lượt xem bản đồ của bạn trên ArexNetwork.
        </p>
        <Link href="/creator/profile" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Tạo hồ sơ creator <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const range = parseRange(sp);
  const a = await getCreatorAnalytics(userId, range);
  const sc = a.statusCounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Tổng quan</h1>
          <p className="text-sm text-muted-foreground">Số liệu trên website ArexNetwork — {range.label}. Không bao gồm lượt chơi trong game.</p>
        </div>
        <Link href="/creator/maps/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" aria-hidden /> Bản đồ mới
        </Link>
      </div>

      <RangePicker basePath="/creator" current={sp} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Lượt xem trong khoảng" value={nf.format(a.totals.views)} hint={METRIC_EXPLAINERS.views} sub={`Tất cả thời gian: ${nf.format(a.lifetime.views)}`} />
        <StatTile label="Lượt xem 24 giờ qua" value={nf.format(a.views24h)} hint={METRIC_EXPLAINERS.views} />
        <StatTile label="Khách ước tính / ngày (cộng dồn)" value={nf.format(a.totals.unique)} hint={METRIC_EXPLAINERS.unique} />
        <StatTile label="Tỷ lệ chuyển đổi" value={pct(a.conversion)} hint={METRIC_EXPLAINERS.conversion} />
        <StatTile label="Sao chép mã" value={nf.format(a.totals.copies)} hint={METRIC_EXPLAINERS.copies} />
        <StatTile label="Mở hướng dẫn" value={nf.format(a.totals.guide)} hint={METRIC_EXPLAINERS.guide} />
        <StatTile label="Lượt lưu (tổng)" value={nf.format(a.lifetime.favorites)} hint={METRIC_EXPLAINERS.favorites} sub={`+${nf.format(a.totals.favorites)} trong khoảng`} />
        <StatTile
          label="Đánh giá"
          value={a.lifetime.ratings > 0 ? (a.lifetime.ratingSum / a.lifetime.ratings).toFixed(1) : "—"}
          hint={METRIC_EXPLAINERS.rating}
          sub={`${nf.format(a.lifetime.ratings)} lượt · ${nf.format(a.lifetime.shares)} chia sẻ`}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        {(["published", "pending", "rejected"] as const).map((s) => (
          <Link key={s} href={`/creator/maps?status=${s}`} className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
            <div className="text-xs text-muted-foreground">{MAP_STATUS_META[s].label}</div>
            <div className="mt-1 font-heading text-xl font-bold tabular-nums">{sc[s] ?? 0}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Lượt xem theo ngày</h2>
        <DailyAreaChart data={a.series} dataKey="views" label="Lượt xem" height={260} />
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-sm font-semibold">Xếp hạng bản đồ của bạn</h2>
          <Link href="/creator/analytics" className="text-sm font-medium text-primary hover:underline">Phân tích chi tiết</Link>
        </div>
        {a.ranking.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Bạn chưa có bản đồ nào. <Link href="/creator/maps/new" className="text-primary hover:underline">Tạo bản đồ đầu tiên</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Bản đồ</th>
                  <th className="px-3 py-2 text-right font-medium">Xem (khoảng)</th>
                  <th className="px-3 py-2 text-right font-medium">Sao chép mã</th>
                  <th className="px-3 py-2 text-right font-medium">Chuyển đổi</th>
                  <th className="px-5 py-2 text-right font-medium">Tổng lượt xem</th>
                </tr>
              </thead>
              <tbody>
                {a.ranking.slice(0, 10).map((m, i) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      {m.status === "published" ? (
                        <Link href={craftlandMapHref(m.slug)} className="font-medium hover:text-primary">{m.title}</Link>
                      ) : (
                        <Link href={`/creator/maps/${m.id}`} className="font-medium hover:text-primary">{m.title}</Link>
                      )}
                      {m.status !== "published" && <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] ${MAP_STATUS_META[m.status].tone}`}>{MAP_STATUS_META[m.status].label}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeViews)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nf.format(m.rangeCopies)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pct(m.conversion)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{nf.format(m.totalViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
