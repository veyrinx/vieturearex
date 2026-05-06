"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  onUploaded: (url: string) => void;
  endpoint?: string;
  bucket?: string;
  accept?: string;
  className?: string;
  label?: string;
};

export function ImageUploadButton({
  onUploaded,
  endpoint = "/api/upload",
  bucket = "logos",
  accept = "image/*",
  className,
  label = "Tải ảnh lên",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", bucket);
      const res = await fetch(endpoint, { method: "POST", body: form, credentials: "same-origin" });
      const data = await res.json() as { publicUrl?: string; error?: string };
      if (!res.ok || !data.publicUrl) {
        toast.error(data.error ?? "Upload thất bại.");
        return;
      }
      onUploaded(data.publicUrl);
    } catch {
      toast.error("Lỗi mạng khi tải ảnh.");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className={className ?? "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 h-9 text-xs font-medium hover:border-primary/40 transition-colors disabled:opacity-50"}
      >
        {uploading
          ? <Loader2 className="size-3.5 animate-spin" />
          : <Upload className="size-3.5" />
        }
        {uploading ? "Đang tải..." : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}
