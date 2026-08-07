"use client";

import Image from "next/image";
import { X, ImagePlus } from "lucide-react";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import { cn } from "@/lib/utils";

/**
 * Ô chọn nhiều ảnh — dùng cho ảnh tin đăng và ảnh bằng chứng ở từng bước đơn.
 *
 * `bucket` quyết định ảnh nằm ở đâu:
 *   "shop"         → công khai, dành cho ảnh tin đăng (ai cũng phải xem được)
 *   "shop-private" → kín, dành cho CCCD và ảnh bằng chứng; server trả về đường
 *                    dẫn `/api/shop/file?p=…` thay vì link Supabase.
 */
export function ImagePicker({
  value,
  onChange,
  max = 6,
  label = "Thêm ảnh",
  hint,
  required,
  className,
  bucket = "shop-private",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  bucket?: "shop" | "shop-private";
}) {
  const full = value.length >= max;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((url) => (
          <div key={url} className="relative size-20 overflow-hidden rounded-xl border border-border bg-muted">
            <Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white transition hover:bg-red-500"
              aria-label="Xoá ảnh"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {!full && (
          <ImageUploadButton
            bucket={bucket}
            label={label}
            onUploaded={(url) => onChange([...value, url])}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          />
        )}
      </div>

      {hint && (
        <p className="text-[11px] text-muted-foreground">
          {required && <span className="font-bold text-red-500">* </span>}
          {hint}
        </p>
      )}
      {value.length === 0 && !hint && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ImagePlus className="size-3" /> Tối đa {max} ảnh
        </p>
      )}
    </div>
  );
}
