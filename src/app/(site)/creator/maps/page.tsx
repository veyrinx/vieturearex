/* eslint-disable @next/next/no-img-element -- ảnh cover do creator tải lên */
import Link from "next/link";
import { Map as MapIcon, Plus } from "lucide-react";
import { MapStatusActions } from "@/components/craftland/studio-forms";
import { requireStudioUser, tbl } from "@/lib/server/craftland";
import { MAP_STATUS_META, craftlandMapHref } from "@/lib/constants/craftland";
import type { CraftlandMap, CraftlandMapStatus } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(MAP_STATUS_META) as CraftlandMapStatus[];
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function StudioMapsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { userId } = await requireStudioUser({ needProfile: true });
  const status = (await searchParams).status;
  const filter = STATUSES.includes(status as CraftlandMapStatus) ? (status as CraftlandMapStatus) : null;

  const { data } = (await tbl("craftland_maps")
    .select("id, slug, title, status, cover_url, moderation_note, view_count, favorite_count, updated_at, version")
    .eq("creator_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500)) as unknown as { data: Array<Pick<CraftlandMap, "id" | "slug" | "title" | "status" | "cover_url" | "moderation_note" | "view_count" | "favorite_count" | "updated_at" | "version">> | null };
  const all = data ?? [];
  const maps = filter ? all.filter((m) => m.status === filter) : all;
  const counts = all.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.status]: (acc[m.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Bản đồ của tôi</h1>
        <Link href="/creator/maps/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" aria-hidden /> Bản đồ mới
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link href="/creator/maps" className={cn("rounded-full border px-3 py-1 text-sm", !filter ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Tất cả ({all.length})
        </Link>
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <Link key={s} href={`/creator/maps?status=${s}`} className={cn("rounded-full border px-3 py-1 text-sm", filter === s ? "border-primary bg-primary/10 text-primary" : "border-border")}>
            {MAP_STATUS_META[s].label} ({counts[s]})
          </Link>
        ))}
      </div>

      {maps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          {filter ? "Không có bản đồ ở trạng thái này." : <>Bạn chưa có bản đồ nào. <Link href="/creator/maps/new" className="text-primary hover:underline">Tạo bản đồ đầu tiên</Link>.</>}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {maps.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36">
                {m.cover_url ? <img src={m.cover_url} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><MapIcon className="size-6 text-muted-foreground" aria-hidden /></div>}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/creator/maps/${m.id}`} className="font-semibold hover:text-primary">{m.title}</Link>
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", MAP_STATUS_META[m.status].tone)}>{MAP_STATUS_META[m.status].label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cập nhật {dateFmt.format(new Date(m.updated_at))} · Phiên bản {m.version} · {m.view_count} lượt xem web · {m.favorite_count} lượt lưu
                </p>
                {m.moderation_note && ["rejected", "hidden", "removed"].includes(m.status) && (
                  <p className="text-xs text-red-700 dark:text-red-300">Phản hồi kiểm duyệt: {m.moderation_note}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {m.status === "published" && <Link href={craftlandMapHref(m.slug)} className="text-sm font-medium text-primary hover:underline">Xem trang</Link>}
                <Link href={`/creator/maps/${m.id}`} className="text-sm font-medium hover:underline">Chỉnh sửa</Link>
                <MapStatusActions mapId={m.id} status={m.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
