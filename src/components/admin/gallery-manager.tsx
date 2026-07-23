"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, UploadCloud, RefreshCw, Loader2 } from "lucide-react";
import { useGalleryQuery, useInvalidateGallery } from "@/hooks/use-gallery-query";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function GalleryManager() {
  const invalidate = useInvalidateGallery();
  const { data: gallery = [], isLoading } = useGalleryQuery();
  const [tag, setTag] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = async () => {
    await invalidate();
  };

  // Đồng bộ từ kho lưu trữ: thêm ảnh chưa có, bỏ qua ảnh đã tồn tại.
  const onSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/gallery/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        added?: number; skipped?: number; total?: number; error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "ĐỒNG BỘ THẤT BẠI.");
        return;
      }
      toast.success(
        data.added
          ? `ĐÃ THÊM ${data.added} ẢNH MỚI · BỎ QUA ${data.skipped ?? 0} ẢNH ĐÃ CÓ.`
          : `KHÔNG CÓ ẢNH MỚI · TẤT CẢ ${data.skipped ?? 0} ẢNH ĐÃ CÓ TRONG THƯ VIỆN.`,
      );
      await refresh();
    } catch {
      toast.error("Lỗi mạng khi đồng bộ.");
    } finally {
      setIsSyncing(false);
    }
  };

  const onUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "gallery");
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      toast.error("TẢI ẢNH LÊN THẤT BẠI.");
      return;
    }

    const data = (await response.json()) as { publicUrl: string };
    setImageUrl(data.publicUrl);
    toast.success("TẢI ẢNH LÊN THÀNH CÔNG.");
  };

  const onCreate = async () => {
    if (!tag || !imageUrl) {
      toast.error("VUI LÒNG NHẬP ĐỦ THẺ TAG VÀ ĐƯỜNG DẪN ẢNH.");
      return;
    }
    // Bỏ qua nếu ảnh đã có trong thư viện (tránh trùng lặp).
    if (gallery.some((g) => g.image_url === imageUrl)) {
      toast.error("ẢNH NÀY ĐÃ CÓ TRONG THƯ VIỆN — BỎ QUA.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, tag }),
      });
      if (!response.ok) { toast.error("KHÔNG THỂ THÊM ẢNH VÀO THƯ VIỆN."); return; }
      toast.success("ĐÃ THÊM ẢNH VÀO THƯ VIỆN.");
      setTag("");
      setImageUrl("");
      await refresh();
    } catch {
      toast.error("Lỗi mạng, không thể thêm ảnh.");
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const response = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) { toast.error("XÓA ẢNH THẤT BẠI."); return; }
      toast.success("ĐÃ XÓA ẢNH.");
      await refresh();
    } catch {
      toast.error("Lỗi mạng, không thể xóa ảnh.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold uppercase tracking-[0.08em] text-foreground">
            Thêm ảnh mới
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="gap-1.5 rounded-xl text-xs"
            title="Quét kho lưu trữ, thêm ảnh chưa có, bỏ qua ảnh đã có"
          >
            {isSyncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {isSyncing ? "ĐANG ĐỒNG BỘ..." : "ĐỒNG BỘ TỪ KHO"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="THẺ TAG"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="DÁN URL ẢNH HOẶC TẢI TỆP"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium uppercase tracking-[0.08em] text-foreground transition hover:bg-muted">
              <UploadCloud className="size-4" />
              TẢI ẢNH
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onUploadFile(file);
                  }
                }}
              />
            </label>
            <Button onClick={onCreate} disabled={isSaving} className="rounded-xl">
              {isSaving ? "ĐANG LƯU..." : "THÊM ẢNH"}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" label="ĐANG TẢI THƯ VIỆN ẢNH..." />
      ) : gallery.length === 0 ? (
        <EmptyState title="THƯ VIỆN ẢNH ĐANG TRỐNG" description="Chưa có hình ảnh nào được thêm vào." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gallery.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.tag} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm font-medium uppercase tracking-[0.08em] text-foreground">{item.tag}</span>
                <ConfirmDeleteDialog
                  itemName={item.tag || "ảnh này"}
                  itemType="ảnh"
                  description="Ảnh sẽ bị xóa khỏi thư viện và không thể khôi phục."
                  onConfirm={() => onDelete(item.id)}
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Xóa ảnh khỏi thư viện"
                      aria-label="Xóa ảnh"
                      className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
