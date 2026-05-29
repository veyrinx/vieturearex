"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, UploadCloud } from "lucide-react";
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

  const refresh = async () => {
    await invalidate();
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
        <h3 className="font-heading text-lg font-semibold uppercase tracking-[0.08em] text-foreground">
          Thêm ảnh mới
        </h3>
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
