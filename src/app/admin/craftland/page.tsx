import type { Metadata } from "next";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { AdminMapsTable, AdminReportsTable, CategoriesManager, type AdminMapRow, type AdminReportRow } from "@/components/craftland/admin-panels";
import { DailyAreaChart } from "@/components/craftland/charts";
import { BreakdownBars, StatTile } from "@/components/craftland/stats";
import { RangePicker } from "@/components/craftland/studio-forms";
import { Pagination } from "@/components/craftland/pagination";
import { requireAdminCapability } from "@/lib/server/admin-access";
import { cleanSearch, getCategories, tbl } from "@/lib/server/craftland";
import { getSystemOverview, parseRange } from "@/lib/server/craftland-stats";
import { MAP_STATUS_META, craftlandMapHref } from "@/lib/constants/craftland";
import type { CraftlandMapStatus } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Craftland" };

const PAGE_SIZE = 30;
const nf = new Intl.NumberFormat("vi-VN");
const REJECTION_LABELS: Record<string, string> = {
  bot: "Bot / trình thu thập",
  cross_origin: "Gửi từ ngoài site",
  rate: "Vượt giới hạn tần suất",
  duplicate: "Trùng trong 30 phút",
  owner: "Chủ bản đồ tự xem",
  not_published: "Bản đồ chưa xuất bản",
  invalid_type: "Loại sự kiện sai",
};

type SP = { tab?: string; status?: string; q?: string; page?: string; range?: string; from?: string; to?: string; report?: string };

export default async function AdminCraftlandPage({ searchParams }: { searchParams: Promise<SP> }) {
  const access = await requireAdminCapability("craftland.moderate");
  const sp = await searchParams;
  const canAnalytics = access.can("craftland.analytics");
  const canContent = access.can("craftland.content");

  const tabs = [
    ...(canAnalytics ? [{ key: "overview", label: "Tổng quan" }] : []),
    { key: "maps", label: "Bản đồ" },
    { key: "reports", label: "Báo cáo" },
    ...(canContent ? [{ key: "categories", label: "Thể loại" }] : []),
  ];
  const tab = tabs.some((t) => t.key === sp.tab) ? sp.tab! : tabs[0].key;

  return (
    <div className="space-y-6 text-foreground">
      <div className="border-b border-border pb-4">
        <h1 className="flex items-center gap-2 font-heading text-xl font-bold">
          <MapIcon className="size-5 text-primary" aria-hidden /> Craftland
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Kiểm duyệt bản đồ, xử lý báo cáo và theo dõi hoạt động. Mọi thao tác được ghi nhật ký append-only.</p>
      </div>

      <nav className="flex gap-1 border-b border-border" aria-label="Tab Craftland">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/craftland?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold", tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview sp={sp} />}
      {tab === "maps" && <MapsTab sp={sp} canContent={canContent} />}
      {tab === "reports" && <ReportsTab sp={sp} />}
      {tab === "categories" && <CategoriesManager categories={await getCategories(true)} />}
    </div>
  );
}

async function Overview({ sp }: { sp: SP }) {
  const range = parseRange(sp);
  const o = await getSystemOverview(range);
  const totalRejected = Object.values(o.rejectionByReason).reduce((s, n) => s + n, 0);
  return (
    <div className="space-y-5">
      <RangePicker basePath="/admin/craftland" current={sp} extra={{ tab: "overview" }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Creator" value={nf.format(o.counts.creators)} sub={`+${nf.format(o.counts.newCreators)} trong khoảng · ${nf.format(o.counts.verified)} đã xác minh`} />
        <StatTile label="Bản đồ đang hoạt động" value={nf.format(o.counts.published)} />
        <Link href="/admin/craftland?tab=maps&status=pending" className="block"><StatTile label="Chờ duyệt" value={nf.format(o.counts.pending)} /></Link>
        <Link href="/admin/craftland?tab=reports" className="block"><StatTile label="Báo cáo đang mở" value={nf.format(o.counts.openReports)} /></Link>
        <StatTile label="Lượt xem (khoảng)" value={nf.format(o.totals.views)} />
        <StatTile label="Sao chép mã (khoảng)" value={nf.format(o.totals.copies)} />
        <StatTile label="Lượt lưu mới (khoảng)" value={nf.format(o.totals.favorites)} />
        <Link href="/admin/craftland/creators" className="block"><StatTile label="Yêu cầu xác minh mở" value={nf.format(o.counts.openVerifications)} /></Link>
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Lượt xem bản đồ toàn hệ thống</h2>
        <DailyAreaChart data={o.series} dataKey="views" label="Lượt xem" />
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Bản đồ được quan tâm</h2>
          {o.topMaps.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p> : (
            <ol className="space-y-1.5 text-sm">
              {o.topMaps.map((m, i) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <span className="truncate"><span className="mr-1.5 text-muted-foreground">{i + 1}.</span>{m.slug ? <Link href={craftlandMapHref(m.slug)} target="_blank" className="hover:text-primary">{m.title}</Link> : m.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{nf.format(m.views)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Từ khoá tìm kiếm phổ biến</h2>
          <BreakdownBars rows={o.topSearches} emptyText="Chưa ghi nhận từ khoá." />
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold">Sự kiện bị loại (bot & bất thường)</h2>
          <p className="mb-3 text-xs text-muted-foreground">{nf.format(totalRejected)} sự kiện không được tính trong khoảng.</p>
          <BreakdownBars rows={Object.entries(o.rejectionByReason).map(([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total)} labelFor={(k) => REJECTION_LABELS[k] ?? k} />
        </section>
      </div>
      <p className="text-xs text-muted-foreground">
        Tình trạng API, database, tác vụ nền và nhật ký bảo mật xem tại <Link href="/admin/ops" className="text-primary hover:underline">Vận hành</Link> và <Link href="/admin/security" className="text-primary hover:underline">Bảo mật</Link>.
      </p>
    </div>
  );
}

async function MapsTab({ sp, canContent }: { sp: SP; canContent: boolean }) {
  const statuses = Object.keys(MAP_STATUS_META) as CraftlandMapStatus[];
  const status = statuses.includes(sp.status as CraftlandMapStatus) ? (sp.status as CraftlandMapStatus) : sp.status === "all" ? null : "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const term = cleanSearch(sp.q);

  let q = tbl("craftland_maps").select(
    "id, slug, title, status, map_code, category_slug, platforms, platforms_verified, is_featured, is_editor_pick, report_count, view_count, submitted_at, updated_at, moderation_note, creator_id",
    { count: "exact" },
  );
  if (status) q = q.eq("status", status);
  if (term) q = q.or(`title.ilike.%${term}%,map_code.ilike.%${term}%,slug.ilike.%${term}%`);
  q = status === "pending" ? q.order("submitted_at", { ascending: true }) : q.order("updated_at", { ascending: false });
  const { data, count } = (await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)) as unknown as {
    data: Array<Omit<AdminMapRow, "creator"> & { creator_id: string }> | null; count: number | null;
  };
  const rows = data ?? [];
  const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
  const { data: creators } = creatorIds.length
    ? ((await tbl("craftland_creators").select("user_id, username, display_name").in("user_id", creatorIds)) as unknown as { data: Array<{ user_id: string; username: string; display_name: string }> | null })
    : { data: [] };
  const byId = new Map((creators ?? []).map((c) => [c.user_id, c]));
  const maps: AdminMapRow[] = rows.map((r) => ({ ...r, creator: byId.get(r.creator_id) ?? null }));

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="maps" />
        <select name="status" defaultValue={status ?? "all"} className="h-10 rounded-lg border border-input bg-card px-3 text-sm" aria-label="Trạng thái">
          <option value="all">Mọi trạng thái</option>
          {statuses.map((s) => <option key={s} value={s}>{MAP_STATUS_META[s].label}</option>)}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="Tên, mã map, slug…" maxLength={60} className="h-10 w-64 rounded-lg border border-input bg-card px-3 text-sm" aria-label="Tìm bản đồ" />
        <button type="submit" className="h-10 rounded-lg border border-border px-4 text-sm font-medium">Lọc</button>
        <span className="text-sm text-muted-foreground">{nf.format(count ?? 0)} kết quả</span>
      </form>
      <AdminMapsTable maps={maps} canContent={canContent} />
      <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} basePath="/admin/craftland" params={{ tab: "maps", status: status ?? "all", q: sp.q }} />
    </div>
  );
}

async function ReportsTab({ sp }: { sp: SP }) {
  const status = sp.report === "closed" ? "closed" : "open";
  let q = tbl("craftland_reports").select("id, map_id, reason, details, status, created_at, resolution_note");
  q = status === "open" ? q.eq("status", "open").order("created_at", { ascending: true }) : q.neq("status", "open").order("handled_at", { ascending: false });
  const { data } = (await q.limit(100)) as unknown as { data: Array<Omit<AdminReportRow, "map"> & { map_id: string }> | null };
  const rows = data ?? [];
  const mapIds = Array.from(new Set(rows.map((r) => r.map_id)));
  const { data: maps } = mapIds.length
    ? ((await tbl("craftland_maps").select("id, slug, title, status").in("id", mapIds)) as unknown as { data: Array<NonNullable<AdminReportRow["map"]>> | null })
    : { data: [] };
  const byId = new Map((maps ?? []).map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        <Link href="/admin/craftland?tab=reports" className={cn("rounded-full border px-3 py-1", status === "open" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Đang mở</Link>
        <Link href="/admin/craftland?tab=reports&report=closed" className={cn("rounded-full border px-3 py-1", status === "closed" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Đã đóng</Link>
      </div>
      <AdminReportsTable reports={rows.map((r) => ({ ...r, map: byId.get(r.map_id) ?? null }))} />
    </div>
  );
}
