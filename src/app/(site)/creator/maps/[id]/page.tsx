import Link from "next/link";
import { notFound } from "next/navigation";
import { MapForm, MapStatusActions } from "@/components/craftland/studio-forms";
import { getCategories, requireStudioUser, tbl } from "@/lib/server/craftland";
import { MAP_STATUS_META, craftlandMapHref } from "@/lib/constants/craftland";
import type { CraftlandMap } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

const ACTION_LABELS: Record<string, string> = {
  approve: "Đã duyệt & xuất bản",
  reject: "Bị từ chối",
  hide: "Bị ẩn",
  restore: "Được khôi phục",
  remove: "Bị gỡ",
  unremove: "Huỷ gỡ",
  feature: "Được ghim nổi bật",
  unfeature: "Bỏ ghim nổi bật",
  pick: "Được đề xuất",
  unpick: "Bỏ đề xuất",
  verify_platforms: "Xác nhận nền tảng",
  unverify_platforms: "Bỏ xác nhận nền tảng",
  staff_edit: "Kiểm duyệt viên chỉnh sửa",
  creator_submit: "Bạn gửi duyệt",
  creator_save: "Bạn cập nhật",
  creator_archive: "Bạn lưu trữ",
  creator_restore: "Bạn khôi phục",
};

export default async function EditMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, creator } = await requireStudioUser({ needProfile: true });
  const { id } = await params;

  // Lọc theo creator_id: map của người khác trả 404 y như không tồn tại.
  const { data: map } = (await tbl("craftland_maps").select("*").eq("id", id).eq("creator_id", userId).maybeSingle()) as unknown as { data: CraftlandMap | null };
  if (!map) notFound();

  const [categories, versionsRes, historyRes] = await Promise.all([
    getCategories(),
    tbl("craftland_map_versions").select("version, note, created_at").eq("map_id", id).order("version", { ascending: false }).limit(30) as unknown as Promise<{
      data: Array<{ version: number; note: string | null; created_at: string }> | null;
    }>,
    tbl("craftland_moderation_actions").select("action, reason, created_at").eq("target_type", "map").eq("target_id", id)
      .eq("outcome", "success").order("created_at", { ascending: false }).limit(30) as unknown as Promise<{
      data: Array<{ action: string; reason: string | null; created_at: string }> | null;
    }>,
  ]);
  const meta = MAP_STATUS_META[map.status];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/creator/maps" className="text-sm text-muted-foreground hover:text-foreground">← Bản đồ của tôi</Link>
            <h1 className="mt-1 font-heading text-2xl font-bold">{map.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {map.status === "published" && <Link href={craftlandMapHref(map.slug)} className="text-sm font-medium text-primary hover:underline">Xem trang công khai</Link>}
            <MapStatusActions mapId={map.id} status={map.status} />
          </div>
        </div>

        <div className={cn("rounded-xl p-4 text-sm", meta.tone)}>
          <strong>{meta.label}.</strong> {meta.hint}
          {map.moderation_note && ["rejected", "hidden", "removed", "published"].includes(map.status) && (
            <p className="mt-1">Phản hồi kiểm duyệt: {map.moderation_note}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <MapForm map={map} categories={categories} canPublish={!!creator?.can_publish && creator.status === "active"} />
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Lịch sử kiểm duyệt</h2>
          {(historyRes.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Chưa có.</p>
          ) : (
            <ol className="mt-2 space-y-2.5 text-sm">
              {historyRes.data!.map((h, i) => (
                <li key={i}>
                  <div className="font-medium">{ACTION_LABELS[h.action] ?? h.action}</div>
                  {h.reason && <div className="text-muted-foreground">{h.reason}</div>}
                  <div className="text-xs text-muted-foreground">{dt.format(new Date(h.created_at))}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Lịch sử phiên bản</h2>
          <ol className="mt-2 space-y-2 text-sm">
            {(versionsRes.data ?? []).map((v) => (
              <li key={v.version} className="flex gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">v{v.version}</span>
                <span className="min-w-0">
                  <span className="block">{v.note ?? "Cập nhật"}</span>
                  <span className="text-xs text-muted-foreground">{dt.format(new Date(v.created_at))}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
